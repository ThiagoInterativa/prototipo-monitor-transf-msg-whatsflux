import React, { useState, useEffect, useCallback } from 'react';
import { AuditRecord } from '../types';
import { fetchAuditoria, fetchTecnicos, deleteAuditPeriod } from '../lib/api';
import { formatDateTime, formatPhone, getPastDate, getTodayDate } from '../lib/formatters';
import { Download, Trash2, Search, Filter, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';

interface AuditReportProps {
  onAuditUpdated?: () => void;
}

export const AuditReport: React.FC<AuditReportProps> = ({ onAuditUpdated }) => {
  const [startDate, setStartDate] = useState<string>(getPastDate(30));
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [tecnico, setTecnico] = useState<string>('Todos');
  const [search, setSearch] = useState<string>('');
  const [tecnicosList, setTecnicosList] = useState<string[]>([]);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [resAudit, resTecs] = await Promise.all([
        fetchAuditoria({ startDate, endDate, tecnico, search }),
        fetchTecnicos(),
      ]);
      setRecords(resAudit.records);
      setTecnicosList(resTecs);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao carregar dados de auditoria' });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, tecnico, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownloadCsv = () => {
    const q = new URLSearchParams({
      startDate,
      endDate,
    });
    if (tecnico && tecnico !== 'Todos') {
      q.set('tecnico', tecnico);
    }
    const url = `/api/export-csv?${q.toString()}`;
    window.location.href = url;
  };

  const handleDeletePeriod = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteAuditPeriod({ startDate, endDate });
      setFeedback({
        type: 'success',
        message: `Sucesso: ${res.removed} registro(s) excluídos do período selecionado.`,
      });
      setDeleteConfirmOpen(false);
      loadData();
      if (onAuditUpdated) onAuditUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao excluir período' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-xl p-4 sm:p-6 border border-slate-800 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <span>📄</span> Relatório de Auditoria de Transferências
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico permanente salvo no banco SQLite. Permite filtros, pesquisa e exportação oficial em CSV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-audit"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            id="btn-download-csv"
            onClick={handleDownloadCsv}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm flex items-center gap-1.5 transition-all"
            title="Exportar dados no formato CSV com cabeçalhos oficiais"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
        <div>
          <label className="block text-slate-400 mb-1 font-medium">Data Inicial</label>
          <input
            id="filter-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium">Data Final</label>
          <input
            id="filter-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Técnico
          </label>
          <select
            id="filter-tecnico"
            value={tecnico}
            onChange={(e) => setTecnico(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-sky-500"
          >
            <option value="Todos">Todos os técnicos</option>
            {tecnicosList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-slate-400 mb-1 font-medium flex items-center gap-1">
            <Search className="w-3 h-3 text-slate-400" />
            Buscar (Cliente, Ticket ou Telefone)
          </label>
          <div className="flex gap-2">
            <input
              id="filter-search"
              type="text"
              placeholder="Digite para filtrar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              id="btn-open-delete-modal"
              onClick={() => setDeleteConfirmOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 flex items-center gap-1 transition-colors"
              title="Excluir registros deste período"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Excluir</span>
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
              : 'bg-rose-950/50 text-rose-300 border border-rose-800/50'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {deleteConfirmOpen && (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-200 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">
                Atenção: Confirma a exclusão permanente dos registros de auditoria entre {startDate} e {endDate}?
              </p>
              <p className="text-rose-300 mt-0.5">
                Esta ação remove as linhas da tabela SQLite e não pode ser desfeita.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeletePeriod}
              disabled={isDeleting}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir do banco'}
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Audit Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Exibindo <strong className="text-white">{records.length}</strong> registro(s) de transferência
          </span>
          <span>Ordem: Mais recentes primeiro</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Ticket</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Técnico Anterior</th>
                <th className="py-2.5 px-3"></th>
                <th className="py-2.5 px-3">Novo Técnico</th>
                <th className="py-2.5 px-3">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                    Carregando registros...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhuma transferência encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-sky-400 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded text-[11px]">
                        #{row.ticket_id}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white max-w-[180px] truncate">
                      {row.cliente || 'Sem nome'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {formatPhone(row.telefone)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {row.tecnico_anterior || '—'}
                    </td>
                    <td className="py-2.5 px-1 text-center whitespace-nowrap">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400 inline" />
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-amber-300">
                      {row.tecnico_atual}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {formatDateTime(row.data_hora)}
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
