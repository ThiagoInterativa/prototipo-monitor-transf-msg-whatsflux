import React from 'react';
import { MonitorStatus } from '../types';
import { formatDateTime } from '../lib/formatters';
import { Activity, Clock, Layers, AlertTriangle, ShieldCheck } from 'lucide-react';

interface CycleStatusProps {
  status: MonitorStatus | null;
}

export const CycleStatus: React.FC<CycleStatusProps> = ({ status }) => {
  return (
    <div className="bg-slate-900/60 rounded-xl p-3 sm:p-4 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          {status?.active ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Monitoramento ativo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Monitoramento pausado
            </span>
          )}
        </div>

        <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Última consulta:</span>
          <strong className="text-slate-200">
            {formatDateTime(status?.lastRun)}
          </strong>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span>Ciclos executados:</span>
          <strong className="text-slate-200">{status?.totalCycles ?? 0}</strong>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span>Intervalo:</span>
          <strong className="text-slate-200">{(status?.interval ?? 2.0).toFixed(1)}s</strong>
        </div>

        <div className="h-3 w-px bg-slate-800 hidden sm:block"></div>

        <div className="flex items-center gap-1.5 text-emerald-400" title="Tickets finalizados no WhatsFlux são removidos automaticamente para evitar falsas transferências">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-slate-300">Auto-limpeza de finalizados:</span>
          <strong className="font-semibold text-emerald-300">Ativa</strong>
        </div>
      </div>

      {status?.lastError && (
        <div className="w-full mt-1 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="truncate">{status.lastError}</span>
        </div>
      )}
    </div>
  );
};
