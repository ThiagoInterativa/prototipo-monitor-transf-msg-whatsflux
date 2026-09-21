import { MonitorStatus, AuditRecord, MonitoredStateItem, TransferEvent } from '../types';

export async function fetchStatus(): Promise<MonitorStatus> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Falha ao obter status do monitoramento');
  return res.json();
}

export async function startMonitoring(): Promise<{ success: boolean }> {
  const res = await fetch('/api/monitor/start', { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao iniciar monitoramento');
  return res.json();
}

export async function pauseMonitoring(): Promise<{ success: boolean }> {
  const res = await fetch('/api/monitor/pause', { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao pausar monitoramento');
  return res.json();
}

export async function updateInterval(interval: number): Promise<{ success: boolean; interval: number }> {
  const res = await fetch('/api/monitor/interval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interval }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar intervalo');
  return res.json();
}

export async function triggerCycle(): Promise<{ success: boolean; transfers: TransferEvent[] }> {
  const res = await fetch('/api/monitor/trigger', { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao executar ciclo manual');
  return res.json();
}

export async function fetchAuditoria(params: {
  startDate: string;
  endDate: string;
  tecnico?: string;
  search?: string;
}): Promise<{ records: AuditRecord[]; total: number }> {
  const q = new URLSearchParams();
  q.set('startDate', params.startDate);
  q.set('endDate', params.endDate);
  if (params.tecnico && params.tecnico !== 'Todos') {
    q.set('tecnico', params.tecnico);
  }
  if (params.search) {
    q.set('search', params.search);
  }

  const res = await fetch(`/api/auditoria?${q.toString()}`);
  if (!res.ok) throw new Error('Falha ao consultar auditoria');
  return res.json();
}

export async function fetchTecnicos(): Promise<string[]> {
  const res = await fetch('/api/tecnicos');
  if (!res.ok) throw new Error('Falha ao carregar lista de técnicos');
  return res.json();
}

export async function fetchMonitoredState(): Promise<MonitoredStateItem[]> {
  const res = await fetch('/api/estado-atual');
  if (!res.ok) throw new Error('Falha ao carregar estado temporário');
  return res.json();
}

export async function cleanTempState(data: {
  startDate: string;
  endDate: string;
  confirmar?: boolean;
}): Promise<{ status: string; removed: number; preservedOpen: number }> {
  const res = await fetch('/api/limpeza-estado', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha na limpeza do estado temporário');
  return res.json();
}

export async function deleteAuditPeriod(data: {
  startDate: string;
  endDate: string;
}): Promise<{ removed: number }> {
  const res = await fetch('/api/excluir-auditoria', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao excluir registros da auditoria');
  return res.json();
}

export async function testConnection(credentials?: {
  email?: string;
  password?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials || {}),
  });
  const data = await res.json();
  return data;
}

export async function saveCredentials(data: {
  email: string;
  password?: string;
  queueId: number;
  useSimulation: boolean;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Falha ao salvar configurações');
  }
  return res.json();
}

export async function triggerSimulatedTransfer(): Promise<{ success: boolean; transfer: TransferEvent }> {
  const res = await fetch('/api/simulate-transfer', { method: 'POST' });
  if (!res.ok) throw new Error('Falha ao simular transferência');
  return res.json();
}

export async function deleteSingleAuditRecord(id: number): Promise<{ success: boolean; removed: number }> {
  const res = await fetch(`/api/auditoria/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao excluir registro de auditoria');
  }
  return res.json();
}

export function downloadDatabaseFile(): void {
  const link = document.createElement('a');
  link.href = '/api/download-db';
  link.setAttribute('download', 'auditoria.db');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function deleteSingleMonitoredTicket(ticketId: number | string): Promise<{ success: boolean }> {
  const res = await fetch(`/api/estado-atual/${ticketId}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Falha ao excluir atendimento monitorado');
  }
  return res.json();
}
