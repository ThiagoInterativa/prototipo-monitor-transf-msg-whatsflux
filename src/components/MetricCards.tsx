import React from 'react';
import { MonitorStatus } from '../types';
import { Ticket, Users, UserPlus, Database } from 'lucide-react';

interface MetricCardsProps {
  status: MonitorStatus | null;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ status }) => {
  const cards = [
    {
      id: 'metric-open-tickets',
      label: 'Tickets abertos',
      value: status?.openTicketsCount ?? 0,
      icon: Ticket,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      caption: `Fila #${status?.queueId ?? 18} do WhatsFlux`,
    },
    {
      id: 'metric-monitored-tickets',
      label: 'Em monitoramento',
      value: status?.monitoredCount ?? 0,
      icon: Users,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      caption: 'Atendimentos com técnico atribuído',
    },
    {
      id: 'metric-new-entries',
      label: 'Novos responsáveis',
      value: status?.newEntriesCount ?? 0,
      icon: UserPlus,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      caption: 'Detectados no último ciclo',
    },
    {
      id: 'metric-audit-transfers',
      label: 'Transferências auditadas',
      value: status?.auditTotalCount ?? 0,
      icon: Database,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      caption: 'Registros salvos no banco SQLite',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            id={card.id}
            key={card.id}
            className="bg-slate-900/90 rounded-xl p-4 sm:p-5 border border-slate-800 shadow-sm relative overflow-hidden transition-all hover:border-slate-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-slate-300">
                {card.label}
              </span>
              <div className={`p-2 rounded-lg ${card.bg} ${card.border} border`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${card.color}`}>
                {card.value}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {card.caption}
            </p>
          </div>
        );
      })}
    </div>
  );
};
