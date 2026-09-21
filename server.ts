import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { DatabaseSync } from 'node:sqlite';

dotenv.config();

// ============================================================
// CONFIGURAÇÕES E ESTADO DO MONITOR
// ============================================================

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'auditoria.db');
const STATE_FILE = path.join(process.cwd(), 'estado_monitoramento.json');
const SERVER_CONFIG_FILE = path.join(process.cwd(), 'server_config.json');

const API_LOGIN_URL = 'https://api.whatsflux.com.br/auth/login';
const API_TICKETS_URL = 'https://api.whatsflux.com.br/tickets';

interface ServerConfig {
  email: string;
  senha?: string;
  queueId: number;
  useSimulation: boolean;
  interval: number;
}

// Carrega configurações persistidas ou das variáveis de ambiente
function loadServerConfig(): ServerConfig {
  let fileConfig: Partial<ServerConfig> = {};
  if (fs.existsSync(SERVER_CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(SERVER_CONFIG_FILE, 'utf-8'));
    } catch {
      // ignore
    }
  }

  const email = fileConfig.email || process.env.WHATSFLUX_EMAIL || '';
  const senha = fileConfig.senha || process.env.WHATSFLUX_SENHA || '';
  const queueId = fileConfig.queueId || Number(process.env.WHATSFLUX_QUEUE_ID || '18') || 18;
  const interval = fileConfig.interval || 2.0;
  // Se não tem credenciais configuradas, ativa modo simulação para permitir visualização
  const useSimulation = fileConfig.useSimulation ?? (email.trim() === '' || senha.trim() === '');

  return { email, senha, queueId, useSimulation, interval };
}

function saveServerConfig(cfg: ServerConfig) {
  fs.writeFileSync(SERVER_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

let serverConfig = loadServerConfig();

// ============================================================
// BANCO DE DADOS (SQLite via node:sqlite)
// ============================================================

let db: DatabaseSync;

function initDatabase() {
  db = new DatabaseSync(DB_FILE);

  db.exec(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      ticket_uuid TEXT,
      contact_id INTEGER,
      cliente TEXT,
      telefone TEXT,
      tecnico_anterior_id INTEGER,
      tecnico_anterior TEXT,
      tecnico_atual_id INTEGER,
      tecnico_atual TEXT,
      evento TEXT NOT NULL,
      data_hora TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_auditoria_ticket ON auditoria(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(data_hora);
  `);
}

initDatabase();

// ============================================================
// ESTADO TEMPORÁRIO (estado_monitoramento.json)
// ============================================================

interface TempStateItem {
  ticket_id: number;
  ticket_uuid?: string;
  contact_id?: number;
  cliente: string;
  telefone: string;
  tecnico_id: number;
  tecnico: string;
  detectado_em: string;
}

type TempState = Record<string, TempStateItem>;

function carregarEstadoTemporario(): TempState {
  if (!fs.existsSync(STATE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function salvarEstadoTemporario(estado: TempState) {
  const tmp = STATE_FILE + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(estado, null, 2), 'utf-8');
    fs.renameSync(tmp, STATE_FILE);
  } catch (err) {
    console.error('Erro ao salvar estado temporário:', err);
  }
}

// ============================================================
// GRAVAÇÃO E CONSULTA DE AUDITORIA
// ============================================================

function formatIsoNow(): string {
  // ISO com fuso horário SP ou local
  const now = new Date();
  return now.toISOString();
}

function gravarTransferencia(
  ticket: any,
  tecnicoAnteriorId: number | null,
  tecnicoAnterior: string,
  tecnicoAtualId: number,
  tecnicoAtual: string
) {
  const contato = ticket.contact || {};
  const ticketId = ticket.id;
  const ticketUuid = ticket.uuid || '';
  const contactId = contato.id || null;
  const cliente = contato.name || contato.number || 'Cliente #' + ticketId;
  const telefone = contato.number || '';
  const dataHora = formatIsoNow();

  const stmt = db.prepare(`
    INSERT INTO auditoria (
      ticket_id,
      ticket_uuid,
      contact_id,
      cliente,
      telefone,
      tecnico_anterior_id,
      tecnico_anterior,
      tecnico_atual_id,
      tecnico_atual,
      evento,
      data_hora
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    ticketId,
    ticketUuid,
    contactId,
    cliente,
    telefone,
    tecnicoAnteriorId,
    tecnicoAnterior,
    tecnicoAtualId,
    tecnicoAtual,
    'TRANSFERENCIA',
    dataHora
  );
}

function countAuditoria(): number {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as total FROM auditoria');
    const row = stmt.get() as { total: number } | undefined;
    return row?.total || 0;
  } catch {
    return 0;
  }
}

function getDistinctTecnicos(): string[] {
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT tecnico FROM (
        SELECT tecnico_anterior AS tecnico FROM auditoria WHERE tecnico_anterior IS NOT NULL
        UNION
        SELECT tecnico_atual AS tecnico FROM auditoria WHERE tecnico_atual IS NOT NULL
      ) WHERE tecnico IS NOT NULL AND tecnico != ''
      ORDER BY tecnico ASC
    `);
    const rows = stmt.all() as Array<{ tecnico: string }>;
    return rows.map((r) => r.tecnico);
  } catch {
    return [];
  }
}

// ============================================================
// SESSÃO E COMUNICAÇÃO COM API WHATSFLUX (SERVER-SIDE)
// ============================================================

let whatsfluxAuthToken: string | null = null;
let whatsfluxCookies: string[] = [];

async function loginWhatsflux(email?: string, senha?: string): Promise<{ success: boolean; message: string }> {
  const em = email ?? serverConfig.email;
  const pw = senha ?? serverConfig.senha;

  if (!em || !pw) {
    return { success: false, message: 'Credenciais (e-mail e senha) não configuradas no servidor.' };
  }

  try {
    const resp = await fetch(API_LOGIN_URL, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json;charset=UTF-8',
        'Referer': 'https://app.whatsflux.com.br/',
        'Origin': 'https://app.whatsflux.com.br',
      },
      body: JSON.stringify({ email: em, password: pw }),
    });

    if (resp.status < 200 || resp.status >= 300) {
      return { success: false, message: `Falha no login WhatsFlux (HTTP ${resp.status})` };
    }

    const data = (await resp.json()) as any;
    const token = data.token || data.access_token;
    if (token) {
      whatsfluxAuthToken = token;
    }

    const setCookie = resp.headers.get('set-cookie');
    if (setCookie) {
      whatsfluxCookies = [setCookie];
    }

    if (!token && !setCookie) {
      return { success: false, message: 'Resposta recebida mas sem token ou cookies.' };
    }

    return { success: true, message: 'Conectado com sucesso ao WhatsFlux!' };
  } catch (err: any) {
    return { success: false, message: `Erro de conexão com WhatsFlux: ${err.message || err}` };
  }
}

async function fetchOpenTicketsWhatsflux(): Promise<any[]> {
  if (!whatsfluxAuthToken) {
    const loginRes = await loginWhatsflux();
    if (!loginRes.success) {
      throw new Error(loginRes.message);
    }
  }

  const allTickets: any[] = [];
  let pageNumber = 1;

  while (pageNumber <= 100) {
    const url = new URL(API_TICKETS_URL);
    url.searchParams.set('pageNumber', String(pageNumber));
    url.searchParams.set('status', 'open');
    url.searchParams.set('showAll', 'true');
    url.searchParams.set('queueIds', `[${serverConfig.queueId}]`);

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'Referer': 'https://app.whatsflux.com.br/',
    };

    if (whatsfluxAuthToken) {
      headers['Authorization'] = `Bearer ${whatsfluxAuthToken}`;
    }
    if (whatsfluxCookies.length > 0) {
      headers['Cookie'] = whatsfluxCookies.join('; ');
    }

    const resp = await fetch(url.toString(), { headers });

    if (resp.status === 401) {
      // Renova token e tenta novamente
      whatsfluxAuthToken = null;
      const relogin = await loginWhatsflux();
      if (!relogin.success) {
        throw new Error('Sessão expirada (401) e falha ao reautenticar.');
      }
      return fetchOpenTicketsWhatsflux();
    }

    if (!resp.ok) {
      throw new Error(`Erro na API de tickets (HTTP ${resp.status})`);
    }

    const json = (await resp.json()) as any;
    const tickets = json.tickets || [];
    allTickets.push(...tickets);

    const hasMore = Boolean(json.hasMore);
    if (!hasMore || tickets.length === 0) {
      break;
    }

    pageNumber++;
  }

  return allTickets;
}

// ============================================================
// SIMULAÇÃO PARA TESTE E DEMO (quando sem credenciais ativas)
// ============================================================

const SIMULATED_TECNICOS = [
  { id: 101, name: 'Thiago Martins' },
  { id: 102, name: 'Gabriel Santos' },
  { id: 103, name: 'Mariana Costa' },
  { id: 104, name: 'Lucas Ferreira' },
  { id: 105, name: 'Beatriz Lima' },
];

const SIMULATED_CLIENTES = [
  { name: 'Empresa Alfa Ltda', phone: '5511988880001' },
  { name: 'Dr. Roberto Silveira', phone: '5511977770002' },
  { name: 'Construtora Horizonte', phone: '5521999990003' },
  { name: 'Auto Peças Modelo', phone: '5531987654321' },
  { name: 'Supermercado Central', phone: '5541991234567' },
  { name: 'Dra. Camila Nunes', phone: '5519981112233' },
  { name: 'Logística Rápida SA', phone: '5547992223344' },
];

let simulatedTicketsPool: any[] = [];

function initSimulatedTickets() {
  if (simulatedTicketsPool.length === 0) {
    simulatedTicketsPool = SIMULATED_CLIENTES.map((c, idx) => {
      const tech = SIMULATED_TECNICOS[idx % SIMULATED_TECNICOS.length];
      return {
        id: 10120 + idx,
        uuid: `uuid-tk-${10120 + idx}`,
        status: 'open',
        userId: tech.id,
        user: { id: tech.id, name: tech.name },
        contact: { id: 500 + idx, name: c.name, number: c.phone },
      };
    });
  }
}

function getSimulatedTickets(): any[] {
  initSimulatedTickets();
  return JSON.parse(JSON.stringify(simulatedTicketsPool));
}

function triggerSimulatedTransferLogic() {
  initSimulatedTickets();
  const ticket = simulatedTicketsPool[Math.floor(Math.random() * simulatedTicketsPool.length)];
  const currentTechId = ticket.userId;
  const otherTechs = SIMULATED_TECNICOS.filter((t) => t.id !== currentTechId);
  const newTech = otherTechs[Math.floor(Math.random() * otherTechs.length)];

  ticket.userId = newTech.id;
  ticket.user = { id: newTech.id, name: newTech.name };

  return ticket;
}

// ============================================================
// MOTOR DE MONITORAMENTO EM SEGUNDO PLANO
// ============================================================

interface MonitoringState {
  active: boolean;
  totalCycles: number;
  lastRun: string | null;
  lastError: string | null;
  lastTransfers: any[];
  openTicketsCount: number;
  monitoredCount: number;
  newEntriesCount: number;
}

const monitorState: MonitoringState = {
  active: true,
  totalCycles: 0,
  lastRun: null,
  lastError: null,
  lastTransfers: [],
  openTicketsCount: 0,
  monitoredCount: 0,
  newEntriesCount: 0,
};

let monitoringTimer: NodeJS.Timeout | null = null;

function processTicket(ticket: any, estado: TempState): { tipo: string; [k: string]: any } | null {
  const ticketId = ticket.id;
  if (!ticketId) return null;

  const user = ticket.user;
  const userId = ticket.userId;

  // 1. Sem técnico -> ignora
  if (!user || !userId) return null;

  const tecnicoAtual = user.name;
  if (!tecnicoAtual) return null;

  const contato = ticket.contact || {};
  const cliente = contato.name || contato.number || '';
  const telefone = contato.number || '';

  const dadosAtuais: TempStateItem = {
    ticket_id: ticketId,
    ticket_uuid: ticket.uuid,
    contact_id: contato.id,
    cliente,
    telefone,
    tecnico_id: userId,
    tecnico: tecnicoAtual,
    detectado_em: formatIsoNow(),
  };

  const chave = String(ticketId);

  // 2. Primeira vez
  if (!estado[chave]) {
    estado[chave] = dadosAtuais;
    return {
      tipo: 'ENTRADA_MONITORAMENTO',
      ticket_id: ticketId,
      tecnico: tecnicoAtual,
      cliente,
    };
  }

  const anterior = estado[chave];
  const tecnicoAnteriorId = anterior.tecnico_id;
  const tecnicoAnterior = anterior.tecnico;

  // 3. Mesmo técnico
  if (String(tecnicoAnteriorId) === String(userId)) {
    estado[chave] = {
      ...anterior,
      ticket_uuid: ticket.uuid,
      contact_id: contato.id,
      cliente,
      telefone,
      tecnico_id: userId,
      tecnico: tecnicoAtual,
    };
    return null;
  }

  // 4. Técnico diferente -> Grava transferência
  gravarTransferencia(ticket, tecnicoAnteriorId, tecnicoAnterior, userId, tecnicoAtual);

  estado[chave] = dadosAtuais;

  return {
    tipo: 'TRANSFERENCIA',
    ticket_id: ticketId,
    cliente,
    anterior: tecnicoAnterior,
    atual: tecnicoAtual,
    data_hora: dadosAtuais.detectado_em,
  };
}

async function runMonitoringCycle() {
  const estado = carregarEstadoTemporario();
  let tickets: any[] = [];
  const transferencias: any[] = [];
  let entradas = 0;

  try {
    if (serverConfig.useSimulation) {
      tickets = getSimulatedTickets();
    } else {
      tickets = await fetchOpenTicketsWhatsflux();
    }

    for (const ticket of tickets) {
      const resultado = processTicket(ticket, estado);
      if (!resultado) continue;

      if (resultado.tipo === 'ENTRADA_MONITORAMENTO') {
        entradas++;
      } else if (resultado.tipo === 'TRANSFERENCIA') {
        transferencias.push(resultado);
      }
    }

    salvarEstadoTemporario(estado);

    monitorState.totalCycles++;
    monitorState.lastRun = formatIsoNow();
    monitorState.lastError = null;
    monitorState.openTicketsCount = tickets.length;
    monitorState.monitoredCount = Object.keys(estado).length;
    monitorState.newEntriesCount = entradas;
    monitorState.lastTransfers = transferencias;

    return {
      ticketsAbertos: tickets.length,
      entradas,
      transferencias,
    };
  } catch (err: any) {
    monitorState.lastError = err.message || String(err);
    console.error('Erro no ciclo de monitoramento:', err);
    throw err;
  }
}

function startBackgroundMonitoring() {
  if (monitoringTimer) {
    clearTimeout(monitoringTimer);
    monitoringTimer = null;
  }

  const loop = async () => {
    if (monitorState.active) {
      try {
        await runMonitoringCycle();
      } catch {
        // logged above
      }
    }
    const ms = Math.max(500, (serverConfig.interval || 2.0) * 1000);
    monitoringTimer = setTimeout(loop, ms);
  };

  loop();
}

startBackgroundMonitoring();

// ============================================================
// SERVIDOR EXPRESS
// ============================================================

async function startServer() {
  const app = express();
  app.use(express.json());

  // Permite incorporação segura dentro de Google Sites e iframes
  app.use((_req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://sites.google.com https://*.google.com https://*.googleusercontent.com *;"
    );
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('X-Frame-Options');
    next();
  });

  // Suporte a oEmbed para permitir preview no Google Sites e outros portais
  app.get('/api/oembed', (req, res) => {
    const host = req.get('host') || 'localhost:3000';
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const url = `${proto}://${host}`;
    res.json({
      version: '1.0',
      type: 'rich',
      title: 'Auditoria WhatsFlux',
      author_name: 'Monitor WhatsFlux',
      provider_name: 'WhatsFlux Auditoria',
      provider_url: url,
      width: 1200,
      height: 900,
      html: `<iframe src="${url}" width="100%" height="900" style="border:0;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15);" allow="clipboard-write; fullscreen"></iframe>`,
    });
  });

  // ------------------------------------------------------------
  // ROTAS DE API (server-side, credenciais protegidas)
  // ------------------------------------------------------------

  // Status geral do monitor
  app.get('/api/status', (_req, res) => {
    const estado = carregarEstadoTemporario();
    const maskedEmail = serverConfig.email
      ? serverConfig.email.replace(/^(.)(.*)(@.*)$/, (_, first, mid, domain) => `${first}${'*'.repeat(Math.min(mid.length, 5))}${domain}`)
      : '';

    res.json({
      active: monitorState.active,
      interval: serverConfig.interval,
      queueId: serverConfig.queueId,
      totalCycles: monitorState.totalCycles,
      lastRun: monitorState.lastRun,
      lastError: monitorState.lastError,
      lastTransfers: monitorState.lastTransfers,
      openTicketsCount: monitorState.openTicketsCount,
      monitoredCount: Object.keys(estado).length,
      newEntriesCount: monitorState.newEntriesCount,
      auditTotalCount: countAuditoria(),
      isSimulated: serverConfig.useSimulation,
      credentialsConfigured: Boolean(serverConfig.email && serverConfig.senha),
      maskedEmail,
    });
  });

  // Iniciar monitoramento
  app.post('/api/monitor/start', (_req, res) => {
    monitorState.active = true;
    res.json({ success: true, active: true });
  });

  // Pausar monitoramento
  app.post('/api/monitor/pause', (_req, res) => {
    monitorState.active = false;
    res.json({ success: true, active: false });
  });

  // Atualizar intervalo
  app.post('/api/monitor/interval', (req, res) => {
    const interval = parseFloat(req.body.interval);
    if (!isNaN(interval) && interval >= 0.5 && interval <= 300) {
      serverConfig.interval = interval;
      saveServerConfig(serverConfig);
      startBackgroundMonitoring();
      res.json({ success: true, interval });
    } else {
      res.status(400).json({ error: 'Intervalo inválido. Deve ser entre 0.5 e 300 segundos.' });
    }
  });

  // Executar ciclo imediato manualmente
  app.post('/api/monitor/trigger', async (_req, res) => {
    try {
      const result = await runMonitoringCycle();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Lista de técnicos da auditoria
  app.get('/api/tecnicos', (_req, res) => {
    res.json(getDistinctTecnicos());
  });

  // Consultar auditoria com filtros
  app.get('/api/auditoria', (req, res) => {
    const { startDate, endDate, tecnico, search } = req.query;

    let query = `
      SELECT id, ticket_id, ticket_uuid, contact_id, cliente, telefone,
             tecnico_anterior_id, tecnico_anterior, tecnico_atual_id, tecnico_atual,
             evento, data_hora
      FROM auditoria
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      const startIso = new Date(`${startDate}T00:00:00`).toISOString();
      query += ` AND data_hora >= ?`;
      params.push(startIso);
    }
    if (endDate) {
      const endIso = new Date(`${endDate}T23:59:59`).toISOString();
      query += ` AND data_hora <= ?`;
      params.push(endIso);
    }

    if (tecnico && tecnico !== 'Todos') {
      query += ` AND (tecnico_anterior = ? OR tecnico_atual = ?)`;
      params.push(tecnico, tecnico);
    }

    if (search) {
      query += ` AND (cliente LIKE ? OR telefone LIKE ? OR CAST(ticket_id AS TEXT) LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY data_hora DESC LIMIT 500`;

    try {
      const stmt = db.prepare(query);
      const rows = stmt.all(...params);
      res.json({ records: rows, total: rows.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Estado atual dos atendimentos em monitoramento
  app.get('/api/estado-atual', (_req, res) => {
    const estado = carregarEstadoTemporario();
    res.json(Object.values(estado));
  });

  // Limpar estado temporário
  app.post('/api/limpeza-estado', async (req, res) => {
    const { startDate, endDate, confirmar } = req.body;
    const estado = carregarEstadoTemporario();

    let ticketsAbertosIds = new Set<string>();
    try {
      let tickets: any[] = [];
      if (serverConfig.useSimulation) {
        tickets = getSimulatedTickets();
      } else {
        tickets = await fetchOpenTicketsWhatsflux();
      }
      ticketsAbertosIds = new Set(tickets.map((t) => String(t.id)));
    } catch {
      // continua com preservação
    }

    const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
    const end = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;

    const candidatos: string[] = [];
    const abertosNoPeriodo: any[] = [];

    for (const [chave, item] of Object.entries(estado)) {
      const itemTime = new Date(item.detectado_em).getTime();
      if (itemTime < start || itemTime > end) continue;

      if (ticketsAbertosIds.has(chave)) {
        abertosNoPeriodo.push(item);
      } else {
        candidatos.push(chave);
      }
    }

    if (abertosNoPeriodo.length > 0 && !confirmar) {
      res.json({
        status: 'CONFIRMACAO_NECESSARIA',
        removed: 0,
        preservedOpen: abertosNoPeriodo.length,
      });
      return;
    }

    for (const chave of candidatos) {
      delete estado[chave];
    }

    salvarEstadoTemporario(estado);
    monitorState.monitoredCount = Object.keys(estado).length;

    res.json({
      status: 'OK',
      removed: candidatos.length,
      preservedOpen: abertosNoPeriodo.length,
    });
  });

  // Excluir registro individual de auditoria por ID
  app.delete('/api/auditoria/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }
    try {
      const stmt = db.prepare('DELETE FROM auditoria WHERE id = ?');
      const info = stmt.run(id);
      const changes = Number((info as any)?.changes || 0);
      if (changes > 0) {
        res.json({ success: true, removed: changes });
      } else {
        res.status(404).json({ error: 'Registro não encontrado' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Excluir ticket individual do estado monitorado
  app.delete('/api/estado-atual/:ticketId', (req, res) => {
    const ticketId = String(req.params.ticketId);
    const estado = carregarEstadoTemporario();
    if (estado[ticketId]) {
      delete estado[ticketId];
      salvarEstadoTemporario(estado);
      monitorState.monitoredCount = Object.keys(estado).length;
      res.json({ success: true, removedTicketId: ticketId });
    } else {
      res.status(404).json({ error: 'Atendimento não encontrado no monitoramento' });
    }
  });

  // Excluir auditoria por período
  app.post('/api/excluir-auditoria', (req, res) => {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      res.status(400).json({ error: 'Datas obrigatórias' });
      return;
    }

    const startIso = new Date(`${startDate}T00:00:00`).toISOString();
    const endIso = new Date(`${endDate}T23:59:59`).toISOString();

    try {
      const stmt = db.prepare('DELETE FROM auditoria WHERE data_hora >= ? AND data_hora <= ?');
      const info = stmt.run(startIso, endIso);
      res.json({ removed: Number((info as any)?.changes || 0) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Exportar CSV
  app.get('/api/export-csv', (req, res) => {
    const { startDate, endDate, tecnico } = req.query;

    let query = `
      SELECT id, ticket_id, ticket_uuid, contact_id, cliente, telefone,
             tecnico_anterior_id, tecnico_anterior, tecnico_atual_id, tecnico_atual,
             evento, data_hora
      FROM auditoria
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate) {
      const startIso = new Date(`${startDate}T00:00:00`).toISOString();
      query += ` AND data_hora >= ?`;
      params.push(startIso);
    }
    if (endDate) {
      const endIso = new Date(`${endDate}T23:59:59`).toISOString();
      query += ` AND data_hora <= ?`;
      params.push(endIso);
    }

    if (tecnico && tecnico !== 'Todos') {
      query += ` AND (tecnico_anterior = ? OR tecnico_atual = ?)`;
      params.push(tecnico, tecnico);
    }

    query += ` ORDER BY data_hora DESC`;

    const columns = [
      'id',
      'ticket_id',
      'ticket_uuid',
      'contact_id',
      'cliente',
      'telefone',
      'tecnico_anterior_id',
      'tecnico_anterior',
      'tecnico_atual_id',
      'tecnico_atual',
      'evento',
      'data_hora',
    ];

    try {
      const stmt = db.prepare(query);
      const rows = (stmt.all(...params) as any[]) || [];

      // CSV com ponto-e-vírgula e UTF-8 BOM exatamente como no Streamlit
      let csvContent = '\uFEFF' + columns.join(';') + '\r\n';

      for (const row of rows) {
        const line = columns
          .map((col) => {
            const val = row[col] ?? '';
            const strVal = String(val).replace(/"/g, '""');
            return `"${strVal}"`;
          })
          .join(';');
        csvContent += line + '\r\n';
      }

      const fileStart = (startDate as string) ? (startDate as string).replace(/-/g, '') : 'inicio';
      const fileEnd = (endDate as string) ? (endDate as string).replace(/-/g, '') : 'fim';
      const filename = `auditoria_transferencias_${fileStart}_${fileEnd}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(Buffer.from(csvContent, 'utf-8'));
    } catch (err: any) {
      res.status(500).send(`Erro ao gerar CSV: ${err.message}`);
    }
  });

  // Baixar arquivo do banco de dados SQLite auditoria.db
  app.get('/api/download-db', (_req, res) => {
    try {
      if (!fs.existsSync(DB_FILE)) {
        res.status(404).json({ error: 'Arquivo auditoria.db não encontrado.' });
        return;
      }
      res.setHeader('Content-Type', 'application/x-sqlite3');
      res.setHeader('Content-Disposition', 'attachment; filename="auditoria.db"');
      const fileStream = fs.createReadStream(DB_FILE);
      fileStream.pipe(res);
    } catch (err: any) {
      console.error('Erro ao fazer download do banco de dados auditoria.db:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erro ao baixar banco de dados auditoria.db' });
      }
    }
  });

  // Salvar credenciais no servidor
  app.post('/api/config', (req, res) => {
    const { email, password, queueId, useSimulation } = req.body;

    if (email !== undefined) serverConfig.email = email.trim();
    if (password) serverConfig.senha = password.trim();
    if (queueId !== undefined) serverConfig.queueId = Number(queueId) || 18;
    if (useSimulation !== undefined) serverConfig.useSimulation = Boolean(useSimulation);

    saveServerConfig(serverConfig);
    whatsfluxAuthToken = null; // limpa token para forçar re-autenticação

    res.json({
      success: true,
      message: 'Configurações atualizadas e salvas com segurança no servidor!',
    });
  });

  // Testar conexão
  app.post('/api/test-connection', async (req, res) => {
    const { email, password } = req.body;
    const testResult = await loginWhatsflux(email, password);
    res.json(testResult);
  });

  // Simular uma transferência imediata (para demonstração)
  app.post('/api/simulate-transfer', async (_req, res) => {
    try {
      const ticket = triggerSimulatedTransferLogic();
      const estado = carregarEstadoTemporario();
      const transfer = processTicket(ticket, estado);
      salvarEstadoTemporario(estado);

      if (transfer && transfer.tipo === 'TRANSFERENCIA') {
        monitorState.lastTransfers = [transfer];
        res.json({ success: true, transfer });
      } else {
        res.json({ success: true, message: 'Ticket atualizado' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ------------------------------------------------------------
  // VITE MIDDLEWARE / STATIC FILES
  // ------------------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Auditoria WhatsFlux rodando em http://localhost:${PORT}`);
  });
}

startServer();
