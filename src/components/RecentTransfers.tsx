import React from 'react';
import { TransferEvent } from '../types';
import { ArrowRight, UserCheck, CheckCircle2 } from 'lucide-react';

interface RecentTransfersProps {
  transfers: TransferEvent[];
}

export const RecentTransfers: React.FC<RecentTransfersProps> = ({ transfers }) => {
  return (
    <div className="bg-slate-900/90 rounded-xl p-4 sm:p-5 border border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-semibold text-white flex items-center gap-2">
            <span>🔄</span> Transferências detectadas no ciclo atual
          </h2>
          {transfers.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {transfers.length} nova(s)
            </span>
          )}
        </div>
      </div>

      {transfers.length === 0 ? (
        <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-800 text-center">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Nenhuma transferência de técnico detectada neste ciclo. Todos os atendimentos permanecem com seus respectivos responsáveis.</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {transfers.map((item, idx) => (
            <div
              key={`${item.ticket_id}-${idx}`}
              className="p-3.5 rounded-lg bg-amber-950/20 border-l-4 border-l-amber-500 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300">
                    Ticket #{item.ticket_id}
                  </span>
                  <span className="text-slate-400 text-xs">&bull;</span>
                  <span className="text-xs text-slate-300 font-medium">
                    Cliente: <strong className="text-white">{item.cliente || 'Sem nome'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <span className="flex items-center gap-1 text-slate-400 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span className="line-through text-slate-400">{item.anterior || 'Sem técnico'}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-400 font-bold" />
                  <span className="flex items-center gap-1 text-amber-300 font-bold">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{item.atual}</span>
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-block px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Auditado no SQLite
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
