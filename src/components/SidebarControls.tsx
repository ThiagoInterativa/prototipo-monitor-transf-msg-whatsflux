import React, { useState } from 'react';
import { MonitorStatus } from '../types';
import { updateInterval, startMonitoring, pauseMonitoring, triggerCycle, downloadDatabaseFile } from '../lib/api';
import { Sliders, Play, Pause, RefreshCw, Clock, HelpCircle, Database } from 'lucide-react';

interface SidebarControlsProps {
  status: MonitorStatus | null;
  onStatusUpdated: () => void;
  onOpenGoogleSites: () => void;
  onOpenSecurity: () => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
  status,
  onStatusUpdated,
  onOpenGoogleSites,
  onOpenSecurity,
}) => {
  const [intervalInput, setIntervalInput] = useState<number>(status?.interval ?? 2.0);
  const [isUpdatingInterval, setIsUpdatingInterval] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleApplyInterval = async (val: number) => {
    setIsUpdatingInterval(true);
    try {
      await updateInterval(val);
      setIntervalInput(val);
      onStatusUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingInterval(false);
    }
  };

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      if (status?.active) {
        await pauseMonitoring();
      } else {
        await startMonitoring();
      }
      onStatusUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <aside className="bg-slate-900/90 rounded-xl p-4 sm:p-5 border border-slate-800 shadow-sm space-y-4 text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span>Controles do Monitor</span>
        </h3>
        {status?.active ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Ativo
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            Pausado
          </span>
        )}
      </div>

      {/* Interval Setting */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-slate-300 font-medium">
          <label className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Consultar API a cada:</span>
          </label>
          <span className="font-mono text-sky-300 font-bold">{intervalInput.toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0.5"
            max="60"
            step="0.5"
            value={intervalInput}
            onChange={(e) => setIntervalInput(parseFloat(e.target.value))}
            onMouseUp={() => handleApplyInterval(intervalInput)}
            onTouchEnd={() => handleApplyInterval(intervalInput)}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>0.5s (alta frequencia)</span>
          <span>60s</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 space-y-2">
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className={`w-full py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            status?.active
              ? 'bg-amber-600/80 hover:bg-amber-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
          }`}
        >
          {status?.active ? (
            <>
              <Pause className="w-4 h-4" />
              <span>Pausar Monitoramento</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Iniciar Monitoramento</span>
            </>
          )}
        </button>

        <button
          onClick={async () => {
            try {
              await triggerCycle();
              onStatusUpdated();
            } catch (err) {
              console.error(err);
            }
          }}
          className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center justify-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
          <span>Consultar Agora</span>
        </button>
      </div>

      {/* Info summary */}
      <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Fila WhatsFlux:</span>
          <strong className="text-white">#{status?.queueId ?? 18}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Atendimentos Abertos:</span>
          <strong className="text-sky-300">{status?.openTicketsCount ?? 0}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Com Técnico (Ativos):</span>
          <strong className="text-indigo-300">{status?.monitoredCount ?? 0}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Total Transferências:</span>
          <strong className="text-amber-300">{status?.auditTotalCount ?? 0}</strong>
        </div>
      </div>

      {/* Helpful Shortcuts */}
      <div className="pt-2 border-t border-slate-800 space-y-1.5">
        <button
          onClick={onOpenSecurity}
          className="w-full text-left py-1.5 px-2 rounded-lg text-slate-300 hover:bg-slate-800/80 hover:text-white flex items-center justify-between text-[11px] transition-colors"
        >
          <span>Credenciais Seguras do WhatsFlux</span>
          <span className="text-emerald-400">&rarr;</span>
        </button>

        <button
          id="btn-sidebar-download-db"
          onClick={downloadDatabaseFile}
          className="w-full text-left py-1.5 px-2 rounded-lg text-slate-300 hover:bg-slate-800/80 hover:text-white flex items-center justify-between text-[11px] transition-colors cursor-pointer"
          title="Baixar arquivo físico auditoria.db (SQLite)"
        >
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Baixar auditoria.db</span>
          </span>
          <span className="text-emerald-400">&darr;</span>
        </button>
      </div>
    </aside>
  );
};
