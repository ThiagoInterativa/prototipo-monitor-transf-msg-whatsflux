import React, { useState, useEffect, useCallback } from 'react';
import { AuditRecord } from '../types';
import { fetchAuditoria, fetchTecnicos, deleteAuditPeriod, deleteSingleAuditRecord } from '../lib/api';
import { formatDateTime, formatPhone, getPastDate, getTodayDate } from '../lib/formatters';
import { Download, Trash2, Search, Filter, RefreshCw, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

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
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AuditRecord | null>(null);
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
      // Mantém a seleção caso o registro ainda exista
      setSelectedRecord((prev) => (prev ? resAudit.records.find((r) => r.id === prev.id) || null : null));
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
      setSelectedRecord(null);
      loadData();
      if (onAuditUpdated) onAuditUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao excluir período' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSingleAuditRecord(recordToDelete.id);
      setFeedback({
        type: 'success',
        message: `Registro do Ticket #${recordToDelete.ticket_id} (${recordToDelete.cliente || 'Sem nome'}) excluído com sucesso da auditoria.`,
      });
      if (selectedRecord?.id === recordToDelete.id) {
        setSelectedRecord(null);
      }
      setRecordToDelete(null);
      loadData();
      if (onAuditUpdated) onAuditUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro ao excluir registro de auditoria' });
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
            Histórico permanente salvo no banco SQLite. Permite filtros, exclusão pontual e exportação oficial em CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Excluir Registro Selecionado */}
          <button
            id="btn-delete-selected-audit"
            disabled={!selectedRecord || loading || isDeleting}
            onClick={() => selectedRecord && setRecordToDelete(selectedRecord)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${
              selectedRecord
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/40 cursor-pointer animate-pulse'
                : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
            }`}
            title={
              selectedRecord
                ? `Excluir o registro selecionado (Ticket #${selectedRecord.ticket_id})`
                : 'Selecione um registro na tabela abaixo para excluir'
            }
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>
              {selectedRecord ? `Excluir Selecionado (#${selectedRecord.ticket_id})` : 'Excluir Selecionado'}
            </span>
          </button>

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

      {/* Confirmation Modal for Single Record Delete */}
      {recordToDelete && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/60 text-xs text-rose-200 space-y-3 shadow-lg animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-900/60 text-rose-300 shrink-0">
              <Trash2 className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-white text-sm">
                Excluir Este Registro de Auditoria?
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11.5px] space-y-1 text-slate-300">
                <div><span className="text-slate-400">Ticket:</span> <strong className="text-sky-400 font-mono">#{recordToDelete.ticket_id}</strong></div>
                <div><span className="text-slate-400">Cliente:</span> <strong className="text-white">{recordToDelete.cliente || 'Sem nome'}</strong> ({formatPhone(recordToDelete.telefone)})</div>
                <div><span className="text-slate-400">Transferência:</span> <span className="text-slate-400">{recordToDelete.tecnico_anterior || '—'}</span> <span className="text-amber-400 font-bold">➜</span> <strong className="text-amber-300">{recordToDelete.tecnico_atual}</strong></div>
                <div><span className="text-slate-400">Data / Hora:</span> <span className="font-mono text-slate-300">{formatDateTime(recordToDelete.data_hora)}</span></div>
              </div>
              <p className="text-rose-300/90 text-[11px]">
                Apenas este único registro selecionado será removido permanentemente da tabela de auditoria SQLite.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-900/40">
            <button
              onClick={() => setRecordToDelete(null)}
              disabled={isDeleting}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSingleDelete}
              disabled={isDeleting}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Excluindo...' : 'Sim, Excluir Este Registro'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Period Delete */}
      {deleteConfirmOpen && (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-200 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">
                Atenção: Confirma a exclusão de TODOS os registros de auditoria entre {startDate} e {endDate}?
              </p>
              <p className="text-rose-300 mt-0.5">
                Esta ação remove todas as linhas do período selecionado e não pode ser desfeita.
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
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Exibindo <strong className="text-white">{records.length}</strong> registro(s) de transferência
            </span>
            {selectedRecord && (
              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-medium text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-sky-400" />
                Ticket #{selectedRecord.ticket_id} selecionado
              </span>
            )}
          </div>
          <span className="text-[11px]">Clique em uma linha para selecionar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Sel.</th>
                <th className="py-2.5 px-3">Ticket</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Técnico Anterior</th>
                <th className="py-2.5 px-3"></th>
                <th className="py-2.5 px-3">Novo Técnico</th>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-400" />
                    Carregando registros...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Nenhuma transferência encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                records.map((row) => {
                  const isSelected = selectedRecord?.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRecord(isSelected ? null : row)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-sky-950/40 border-l-4 border-l-sky-500 hover:bg-sky-950/60'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="radio"
                          name="selectedAuditRecord"
                          checked={isSelected}
                          onChange={() => setSelectedRecord(row)}
                          className="w-3.5 h-3.5 text-sky-500 bg-slate-900 border-slate-700 cursor-pointer"
                          title="Selecionar este registro"
                        />
                      </td>
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
                      <td className="py-2.5 px-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedRecord(row);
                            setRecordToDelete(row);
                          }}
                          className="p-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 border border-rose-800/30 hover:border-rose-600 transition-colors inline-flex items-center gap-1 text-[11px]"
                          title="Excluir este registro da auditoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Excluir</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
