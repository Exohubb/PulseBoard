import type { MonitorStatus, IncidentSeverity, IncidentStatus } from '../enums';

export interface MonitorUpdatedEvent {
  monitorId: string;
  workspaceId: string;
  status: MonitorStatus;
  previousStatus?: MonitorStatus;
}

export interface CheckCompletedEvent {
  checkRunId: string;
  monitorId: string;
  workspaceId: string;
  success: boolean;
  latencyMs?: number;
  statusCode?: number;
  errorMessage?: string;
}

export interface ServiceStatusChangedEvent {
  serviceId: string;
  workspaceId: string;
  status: MonitorStatus;
  previousStatus?: MonitorStatus;
}

export interface IncidentCreatedEvent {
  incidentId: string;
  workspaceId: string;
  title: string;
  severity: IncidentSeverity;
  serviceIds: string[];
}

export interface IncidentUpdatedEvent {
  incidentId: string;
  workspaceId: string;
  status: IncidentStatus;
  previousStatus?: IncidentStatus;
  severity?: IncidentSeverity;
  previousSeverity?: IncidentSeverity;
}

export interface AlertSentEvent {
  alertDeliveryId: string;
  alertPolicyId: string;
  alertChannelId: string;
  incidentId?: string;
  status: 'sent' | 'failed';
  error?: string;
}

export interface ScannerCompletedEvent {
  scannerRunId: string;
  workspaceId: string;
  monitorId?: string;
  verdict: 'secure' | 'warning' | 'vulnerable' | 'inconclusive';
  score?: number;
  findingCount: number;
}

export interface HealthCheckEvent {
  workspaceId: string;
  serviceId?: string;
  monitorId?: string;
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

export interface RealtimeConnectionEvent {
  type: 'connected' | 'disconnected' | 'reconnecting';
  workspaceId?: string;
  userId?: string;
}