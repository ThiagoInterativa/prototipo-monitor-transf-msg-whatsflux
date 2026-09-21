import React, { useState, useEffect, useCallback } from 'react';
import { MonitorStatus, TransferEvent } from './types';
import { fetchStatus, startMonitoring, pauseMonitoring, triggerCycle, triggerSimulatedTransfer } from './lib/api';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { CycleStatus } from './components/CycleStatus';
import { RecentTransfers } from './components/RecentTransfers';
import { AuditReport } from './components/AuditReport';
import { MonitoredTicketsView } from './components/MonitoredTicketsView';
import { SidebarControls } from './components/SidebarControls';
import { GoogleSitesModal } from './components/GoogleSitesModal';
import { SecurityConfigModal } from './components/SecurityConfigModal';
import { FileText, Users, Shield, Bell } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'auditoria' | 'monitorados'>('auditoria');
  const [isGoogleSitesModalOpen, setIsGoogleSitesModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; transfer: TransferEvent }>>([]);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchStatus();
      setStatus(data);

      // Se houver novas transferências no ciclo, gera toast
      if (data.lastTransfers && data.lastTransfers.length > 0) {
        data.lastTransfers.forEach((t) => {
          const toastId = `${t.ticket_id}-${Date.now()}-${Math.random()}`;
          setToasts((prev) => {
            // Evita duplicatas recentes
            if (prev.some((item) => item.transfer.ticket_id === t.ticket_id && item.transfer.atual === t.atual)) {
              return prev;
            }
            return [...prev, { id: toastId, transfer: t }];
          });

          setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== toastId));
          }, 6000);
        });
      }
    } catch (err) {
      console.error('Erro ao buscar status do monitor:', err);
    }
  }, []);

  // Polling regular para manter o dashboard sincronizado
  useEffect(() => {
    loadStatus();
    const intervalMs = status?.interval ? Math.max(1000, status.interval * 1000) : 2000;
    const timer = setInterval(loadStatus, intervalMs);
    return () => clearInterval(timer);
  }, [loadStatus, status?.interval]);

  const handleToggleMonitor = async () => {
    try {
      if (status?.active) {
        await pauseMonitoring();
      } else {
        await startMonitoring();
      }
      loadStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerCycle = async () => {
    setIsTriggering(true);
    try {
      await triggerCycle();
      loadStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleSimulateTransfer = async () => {
    try {
      const res = await triggerSimulatedTransfer();
      if (res.transfer) {
        const toastId = `sim-${Date.now()}`;
        setToasts((prev) => [...prev, { id: toastId, transfer: res.transfer }]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== toastId));
        }, 6000);
      }
      loadStatus();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(({ id, transfer }) => (
          <div
            key={id}
            className="pointer-events-auto bg-slate-900 border border-amber-500/50 shadow-2xl shadow-amber-500/10 rounded-xl p-3.5 text-xs text-white flex items-start gap-2.5 animate-in slide-in-from-bottom-2 duration-300"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>🔄 Transferência Detectada!</span>
                <span className="text-[10px] text-slate-400">#{transfer.ticket_id}</span>
              </div>
              <p className="text-slate-300 mt-1">
                Cliente: <strong>{transfer.cliente || 'Sem nome'}</strong>
              </p>
              <p className="text-slate-200 mt-0.5 font-medium">
                <span className="line-through text-slate-400">{transfer.anterior || 'Sem técnico'}</span> &rarr;{' '}
                <span className="text-emerald-400 font-bold">{transfer.atual}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <Header
        status={status}
        onToggleMonitor={handleToggleMonitor}
        onOpenGoogleSites={() => setIsGoogleSitesModalOpen(true)}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        onSimulateTransfer={handleSimulateTransfer}
        onTriggerCycle={handleTriggerCycle}
        isTriggering={isTriggering}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {/* Metric Cards */}
        <MetricCards status={status} />

        {/* Cycle Status Bar */}
        <CycleStatus status={status} />

        {/* Recent Transfers Alert */}
        <RecentTransfers transfers={status?.lastTransfers || []} />

        {/* Navigation Tabs */}
        <div className="border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              id="tab-auditoria"
              onClick={() => setActiveTab('auditoria')}
              className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'auditoria'
                  ? 'border-sky-500 text-sky-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Auditoria SQLite & Exportação</span>
            </button>

            <button
              id="tab-monitorados"
              onClick={() => setActiveTab('monitorados')}
              className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all ${
                activeTab === 'monitorados'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Atendimentos Monitorados ({status?.monitoredCount ?? 0})</span>
            </button>
          </div>

          <button
            id="btn-credenciais-seguras-badge"
            onClick={() => setIsSecurityModalOpen(true)}
            className="hidden sm:flex items-center gap-2 text-xs text-slate-300 hover:text-emerald-300 pr-2 py-1 transition-colors cursor-pointer"
            title="Configurar credenciais seguras"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Credenciais Seguras</span>
          </button>
        </div>

        {/* Content Layout with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3 space-y-5">
            {activeTab === 'auditoria' && <AuditReport onAuditUpdated={loadStatus} />}
            {activeTab === 'monitorados' && <MonitoredTicketsView onStateCleaned={loadStatus} />}
          </div>

          {/* Sidebar with Live Controls */}
          <div className="lg:col-span-1">
            <SidebarControls
              status={status}
              onStatusUpdated={loadStatus}
              onOpenGoogleSites={() => setIsGoogleSitesModalOpen(true)}
              onOpenSecurity={() => setIsSecurityModalOpen(true)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/90 py-3 text-center text-xs text-slate-500">
        Auditoria WhatsFlux &bull; Armazenamento SQLite Local &bull; Monitoramento em Tempo Real
      </footer>

      {/* Modals */}
      <GoogleSitesModal isOpen={isGoogleSitesModalOpen} onClose={() => setIsGoogleSitesModalOpen(false)} />
      <SecurityConfigModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        status={status}
        onConfigSaved={loadStatus}
      />
    </div>
  );
}
