import React, { useState, useEffect, useCallback } from 'react';
import { MonitoredStateItem } from '../types';
import { fetchMonitoredState, cleanTempState } from '../lib/api';
import { formatDateTime, formatPhone, getPastDate, getTodayDate } from '../lib/formatters';
import { Users, RefreshCw, Eraser, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface MonitoredTicketsViewProps {
  onStateCleaned?: () => void;
}

export const MonitoredTicketsView: React.FC<MonitoredTicketsViewProps> = ({ onStateCleaned }) => {
  const [items, setItems] = useState<MonitoredStateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleanStartDate, setCleanStartDate] = useState(getPastDate(30));
  const [cleanEndDate, setCleanEndDate] = useState(getTodayDate());
  const [cleanConfirmModal, setCleanConfirmModal] = useState<boolean>(false);
  const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMonitoredState();
      setItems(data);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha ao buscar atendimentos monitorados' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClean = async (confirmar: boolean = false) => {
    try {
      const res = await cleanTempState({
        startDate: cleanStartDate,
        endDate: cleanEndDate,
        confirmar,
      });

      if (res.status === 'CONFIRMACAO_NECESSARIA') {
        setOpenTicketsCount(res.preservedOpen);
        setCleanConfirmModal(true);
        return;
      }

      setCleanConfirmModal(false);
      setFeedback({
        type: 'success',
        message: `Limpeza concluída: ${res.removed} registros temporários antigos removidos. ${res.preservedOpen} atendimentos ainda abertos foram preservados.`,
      });
      loadData();
      if (onStateCleaned) onStateCleaned();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro durante a limpeza' });
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-xl p-4 sm:p-6 border border-slate-800 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Atendimentos Atualmente Monitorados</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Estado temporário em memória (<code className="text-sky-300">estado_monitoramento.json</code>) que permite comparar o técnico anterior com o atual.
          </p>
        </div>

        <button
          id="btn-refresh-monitored"
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Info notice */}
      <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-xs text-indigo-300 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-white">Como funciona este rastreamento:</strong>
          <span className="block mt-0.5 text-indigo-200/80">
            Quando um ticket da fila recebe um responsável pela primeira vez, ele entra nesta lista. Se o técnico mudar nos próximos ciclos, o sistema dispara o alerta e grava a transferência na auditoria SQLite.
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
              : feedback.type === 'info'
              ? 'bg-sky-950/50 text-sky-300 border border-sky-800/50'
              : 'bg-rose-950/50 text-rose-300 border border-rose-800/50'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Clean section */}
      <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Eraser className="w-3.5 h-3.5 text-amber-400" />
            Limpeza de Registros Temporários
          </span>
          <p className="text-slate-400 mt-0.5 text-[11px]">
            Remove tickets já encerrados do estado temporário. Atendimentos ainda abertos são automaticamente preservados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={cleanStartDate}
            onChange={(e) => setCleanStartDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
          />
          <span className="text-slate-500">até</span>
          <input
            type="date"
            value={cleanEndDate}
            onChange={(e) => setCleanEndDate(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200"
          />
          <button
            id="btn-clean-temp-state"
            onClick={() => handleClean(false)}
            className="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-medium flex items-center gap-1 transition-colors"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Limpar Antigos</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {cleanConfirmModal && (
        <div className="p-4 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200 space-y-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white">Confirmação de Segurança</p>
              <p className="mt-1">
                Foram identificados <strong className="text-white">{openTicketsCount} atendimento(s)</strong> no período que ainda constam como abertos no WhatsFlux.
              </p>
              <p className="text-amber-300 mt-0.5">
                Deseja prosseguir removendo apenas os tickets encerrados e preservando com segurança os abertos?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleClean(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-md transition-colors"
            >
              Confirmar e Preservar Abertos
            </button>
            <button
              onClick={() => setCleanConfirmModal(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table of active monitored tickets */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Total em monitoramento: <strong className="text-white">{items.length}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Ticket</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Técnico Atual</th>
                <th className="py-2.5 px-3">Detectado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    Carregando atendimentos...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhum atendimento com técnico atribuído no momento.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.ticket_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-2 py-0.5 rounded text-[11px]">
                        #{row.ticket_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white max-w-[200px] truncate">
                      {row.cliente || 'Sem nome'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {formatPhone(row.telefone)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-emerald-400">
                      {row.tecnico}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {formatDateTime(row.detectado_em)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
