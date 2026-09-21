import React from 'react';
import { MonitorStatus } from '../types';
import { ShieldCheck, Play, Pause, Globe, Settings, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  status: MonitorStatus | null;
  onToggleMonitor: () => void;
  onOpenGoogleSites: () => void;
  onOpenSecurity: () => void;
  onSimulateTransfer: () => void;
  onTriggerCycle: () => void;
  isTriggering: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onToggleMonitor,
  onOpenGoogleSites,
  onOpenSecurity,
  onSimulateTransfer,
  onTriggerCycle,
  isTriggering,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/20">
            <span className="text-xl">🔎</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Auditoria WhatsFlux
              </h1>
              {status?.isSimulated ? (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Modo Demonstração
                </span>
              ) : (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Conectado à API
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Fila <strong className="text-slate-200">#{status?.queueId ?? 18}</strong> &bull; Monitora responsáveis e registra alterações em tempo real
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status badge */}
          <button
            id="btn-toggle-monitoring"
            onClick={onToggleMonitor}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              status?.active
                ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-700/50 hover:bg-emerald-900/60'
                : 'bg-amber-950/70 text-amber-400 border border-amber-700/50 hover:bg-amber-900/60'
            }`}
            title={status?.active ? 'Clique para pausar monitoramento' : 'Clique para retomar monitoramento'}
          >
            {status?.active ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <Pause className="w-3.5 h-3.5 ml-1" />
                <span>Monitorando</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Pausado</span>
              </>
            )}
          </button>

          {/* Trigger Cycle Button */}
          <button
            id="btn-trigger-cycle"
            onClick={onTriggerCycle}
            disabled={isTriggering}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Consultar API WhatsFlux imediatamente"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggering ? 'animate-spin text-sky-400' : ''}`} />
            <span className="hidden sm:inline">Consultar Agora</span>
          </button>

          {/* Demo Transfer trigger */}
          <button
            id="btn-simulate-transfer"
            onClick={onSimulateTransfer}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-950/60 hover:bg-indigo-900/70 text-indigo-300 border border-indigo-700/40 flex items-center gap-1.5 transition-colors"
            title="Simular troca de técnico para testar auditoria"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Simular Transferência</span>
          </button>

          {/* Google Sites Modal Button */}
          <button
            id="btn-google-sites"
            onClick={onOpenGoogleSites}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1.5 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            <span>Google Sites</span>
          </button>

          {/* Security & Credentials Modal Button */}
          <button
            id="btn-security-config"
            onClick={onOpenSecurity}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Credenciais Seguras</span>
            <Settings className="w-3.5 h-3.5 md:hidden text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
