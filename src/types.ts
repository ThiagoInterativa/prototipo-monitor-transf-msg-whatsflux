export interface TicketContact {
  id?: number;
  name?: string;
  number?: string;
}

export interface TicketUser {
  id?: number;
  name?: string;
  email?: string;
}

export interface WhatsFluxTicket {
  id: number;
  uuid?: string;
  status?: string;
  userId?: number;
  user?: TicketUser;
  contact?: TicketContact;
  updatedAt?: string;
  createdAt?: string;
}

export interface MonitoredStateItem {
  ticket_id: number;
  ticket_uuid?: string;
  contact_id?: number;
  cliente: string;
  telefone: string;
  tecnico_id: number;
  tecnico: string;
  detectado_em: string;
}

export interface AuditRecord {
  id: number;
  ticket_id: number;
  ticket_uuid?: string;
  contact_id?: number;
  cliente: string;
  telefone: string;
  tecnico_anterior_id?: number;
  tecnico_anterior: string;
  tecnico_atual_id?: number;
  tecnico_atual: string;
  evento: string;
  data_hora: string;
}

export interface TransferEvent {
  tipo: 'TRANSFERENCIA';
  ticket_id: number;
  cliente: string;
  anterior: string;
  atual: string;
  data_hora?: string;
}

export interface MonitorStatus {
  active: boolean;
  interval: number;
  queueId: number;
  totalCycles: number;
  lastRun: string | null;
  lastError: string | null;
  lastTransfers: TransferEvent[];
  openTicketsCount: number;
  monitoredCount: number;
  newEntriesCount: number;
  auditTotalCount: number;
  isSimulated: boolean;
  credentialsConfigured: boolean;
  maskedEmail: string;
}

export interface AuditFilterParams {
  startDate: string;
  endDate: string;
  tecnico?: string;
  search?: string;
  page?: number;
  limit?: number;
}
