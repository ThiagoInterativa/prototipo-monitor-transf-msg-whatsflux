import React, { useState } from 'react';
import { MonitorStatus } from '../types';
import { saveCredentials, testConnection } from '../lib/api';
import { X, ShieldCheck, Key, Lock, CheckCircle2, AlertTriangle, RefreshCw, Eye, EyeOff, Radio } from 'lucide-react';

interface SecurityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: MonitorStatus | null;
  onConfigSaved: () => void;
}

export const SecurityConfigModal: React.FC<SecurityConfigModalProps> = ({
  isOpen,
  onClose,
  status,
  onConfigSaved,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [queueId, setQueueId] = useState(status?.queueId ?? 18);
  const [useSimulation, setUseSimulation] = useState(status?.isSimulated ?? true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection({
        email: email || undefined,
        password: password || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erro ao testar comunicação com a API do WhatsFlux',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await saveCredentials({
        email,
        password: password || undefined,
        queueId: Number(queueId) || 18,
        useSimulation,
      });
      setSaveResult(res);
      onConfigSaved();
      // Limpa a senha do estado do React imediatamente para segurança
      setPassword('');
    } catch (err: any) {
      setSaveResult({
        success: false,
        message: err.message || 'Erro ao salvar credenciais no servidor',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-6 text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Segurança & Credenciais do WhatsFlux
              </h3>
              <p className="text-xs text-slate-400">
                Gerenciamento seguro de acesso e proteção contra pessoas não autorizadas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security architecture banner */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Lock className="w-4 h-4" />
            <span>Como o seu problema de segurança com o st.secrets foi resolvido:</span>
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            1. <strong>Backend Blindado:</strong> Todas as chamadas para o WhatsFlux (<code className="text-sky-300">/auth/login</code> e <code className="text-sky-300">/tickets</code>) ocorrem exclusivamente no servidor Node.js.
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            2. <strong>Zero Exposição no Google Sites:</strong> Usuários e visitantes do seu Google Sites nunca recebem a senha nem o token da sessão.
          </p>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            3. <strong>Variáveis de Ambiente:</strong> Você também pode definir as credenciais diretamente via variáveis no arquivo <code className="text-emerald-300">.env</code> (<code className="text-slate-200">WHATSFLUX_EMAIL</code> e <code className="text-slate-200">WHATSFLUX_SENHA</code>).
          </p>
        </div>

        {/* Current status */}
        <div className="mb-4 p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-slate-400 block text-[11px]">Status das Credenciais no Servidor:</span>
            {status?.credentialsConfigured ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configuradas ({status.maskedEmail || 'E-mail gravado'})
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Nenhuma credencial ativa (Usando Modo Demonstração)
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">Fila Monitorada:</span>
            <span className="text-white font-mono font-bold">#{status?.queueId ?? 18}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Simulation vs Real Toggle */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-300 block">Modo de Operação:</span>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                  useSimulation
                    ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={useSimulation}
                  onChange={() => setUseSimulation(true)}
                  className="hidden"
                />
                <Radio className={`w-3.5 h-3.5 ${useSimulation ? 'text-indigo-400' : 'text-slate-500'}`} />
                <div>
                  <strong className="block text-white text-[11px]">Modo Demonstração</strong>
                  <span className="text-[10px] text-slate-400">Gera tickets de teste para validação</span>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                  !useSimulation
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={!useSimulation}
                  onChange={() => setUseSimulation(false)}
                  className="hidden"
                />
                <Radio className={`w-3.5 h-3.5 ${!useSimulation ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <strong className="block text-white text-[11px]">API WhatsFlux Real</strong>
                  <span className="text-[10px] text-slate-400">Conecta à api.whatsflux.com.br</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-sky-400" />
              E-mail da Conta WhatsFlux
            </label>
            <input
              type="email"
              placeholder={status?.maskedEmail ? `Atual: ${status.maskedEmail}` : 'ex: atendente@suaempresa.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Senha da Conta WhatsFlux
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={status?.credentialsConfigured ? '•••••••••••• (deixe em branco para manter a atual)' : 'Digite a senha do WhatsFlux'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              🔒 A senha é salva com segurança no servidor e nunca trafega para o navegador dos visitantes.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              ID da Fila WhatsFlux (QUEUE_ID)
            </label>
            <input
              type="number"
              value={queueId}
              onChange={(e) => setQueueId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Identificador numérico da fila que será auditada (padrão: 18).
            </p>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-700/50'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {saveResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                saveResult.success
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-700/50'
              }`}
            >
              {saveResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{saveResult.message}</span>
            </div>
          )}

          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
            <button
              type="button"
              id="btn-test-connection"
              onClick={handleTest}
              disabled={testing}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-sky-400' : ''}`} />
              <span>{testing ? 'Testando login WhatsFlux...' : 'Testar Conexão'}</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-save-credentials"
                disabled={saving}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{saving ? 'Salvando...' : 'Salvar com Segurança'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
