import type {
  WorkspaceRole,
  ServiceEnvironment,
  MonitorType,
  MonitorStatus,
  IncidentSeverity,
  IncidentSource,
  IncidentStatus,
  IncidentUpdateType,
  AlertPolicyEvent,
} from '../enums';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  accentColor?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  createdAt: Date;
  user?: User;
  workspace?: Workspace;
}

export interface Service {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string;
  environment: ServiceEnvironment;
  ownerTeam?: string;
  status: MonitorStatus;
  tags: string[];
  uptime24h?: number;
  uptime7d?: number;
  uptime30d?: number;
  avgLatency?: number;
  createdAt: Date;
  updatedAt: Date;
  monitors?: Monitor[];
}

export interface Monitor {
  id: string;
  workspaceId: string;
  serviceId: string;
  type: MonitorType;
  name: string;
  active: boolean;
  intervalSeconds: number;
  timeoutMs: number;
  retryCount: number;
  failureThreshold: number;
  recoveryThreshold: number;
  incidentAutoCreate: boolean;
  maintenanceMode: boolean;
  lastRunAt?: Date;
  lastStatus?: MonitorStatus;
  createdAt: Date;
  updatedAt: Date;
  service?: Service;
  httpConfig?: MonitorHttpConfig;
  wsConfig?: MonitorWsConfig;
  scanConfig?: MonitorScanConfig;
}

export interface MonitorHttpConfig {
  id: string;
  monitorId: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
  headers: Record<string, string>;
  body?: string;
  expectedStatus: number;
  expectedJsonPath?: string;
  expectedJsonValue?: string;
  authType: 'none' | 'basic' | 'bearer' | 'api_key';
  authConfig: AuthConfig;
  followRedirects: boolean;
  sslStrict: boolean;
  regionLabel?: string;
}

export interface MonitorWsConfig {
  id: string;
  monitorId: string;
  url: string;
  headers: Record<string, string>;
  authType: 'none' | 'basic' | 'bearer' | 'api_key';
  authConfig: AuthConfig;
  connectTimeoutMs: number;
  expectWelcomeMessage: boolean;
  welcomeMatchType: 'contains' | 'exact' | 'regex' | 'json_path';
  welcomeMatchValue?: string;
  subscribeMessage?: string;
  expectedResponseEvent?: string;
  pingMessage?: string;
  heartbeatTimeoutMs: number;
}

export interface MonitorScanConfig {
  id: string;
  monitorId: string;
  url: string;
  headers: Record<string, string>;
  authType: 'none' | 'basic' | 'bearer' | 'api_key';
  authConfig: AuthConfig;
  scanMode: 'passive' | 'safe_active' | 'custom';
  maxDurationMs: number;
  maxMessages: number;
  allowOriginChecks: boolean;
  allowSchemaFuzz: boolean;
  allowAuthChecks: boolean;
  allowRateLimitProbe: boolean;
  allowEventEnumProbe: boolean;
  allowPayloadSizeProbe: boolean;
  legalAcknowledged: boolean;
  ownershipConfirmed: boolean;
}

export interface AuthConfig {
  username?: string;
  password?: string;
  token?: string;
  headerName?: string;
}

export interface CheckRun {
  id: string;
  monitorId: string;
  workspaceId: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  success: boolean;
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  latencyConnectMs?: number;
  latencyTotalMs?: number;
  responseSizeBytes?: number;
  availabilityState: MonitorStatus;
  rawMeta?: Record<string, unknown>;
}

export interface Incident {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: IncidentSource;
  createdByUserId?: string;
  assignedToUserId?: string;
  startedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  impactSummary?: string;
  internalSummary?: string;
  publicSummary?: string;
  rootCause?: string;
  createdAt: Date;
  updatedAt: Date;
  updates?: IncidentUpdate[];
  services?: Service[];
  affectedMonitors?: Monitor[];
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  type: IncidentUpdateType;
  message: string;
  internalOnly: boolean;
  createdByUserId?: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  user?: User;
}

export interface AlertChannel {
  id: string;
  workspaceId: string;
  type: 'slack' | 'email' | 'webhook';
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertPolicy {
  id: string;
  workspaceId: string;
  name: string;
  enabled: boolean;
  event: AlertPolicyEvent;
  severity?: IncidentSeverity;
  serviceTags?: string[];
  alertChannelIds: string[];
  cooldownMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  alertChannels?: AlertChannel[];
}

export interface AlertDelivery {
  id: string;
  alertPolicyId: string;
  alertChannelId: string;
  incidentId?: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  lastAttemptAt?: Date;
  lastError?: string;
  responseCode?: number;
  responseBody?: string;
  createdAt: Date;
}

export interface StatusPage {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  accentColor?: string;
  introText?: string;
  published: boolean;
  customDomain?: string;
  createdAt: Date;
  updatedAt: Date;
  components?: StatusPageComponent[];
}

export interface StatusPageComponent {
  id: string;
  statusPageId: string;
  serviceId?: string;
  monitorId?: string;
  name: string;
  status: MonitorStatus;
  sortOrder: number;
}

export interface MaintenanceWindow {
  id: string;
  workspaceId: string;
  serviceId?: string;
  monitorId?: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  workspaceId?: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  user?: User;
}

export interface ScannerRun {
  id: string;
  workspaceId: string;
  monitorId?: string;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  verdict: 'secure' | 'warning' | 'vulnerable' | 'inconclusive';
  summary?: string;
  meta?: Record<string, unknown>;
  findings?: ScannerFinding[];
}

export interface ScannerFinding {
  id: string;
  scannerRunId: string;
  category: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'pass' | 'fail' | 'warning' | 'info' | 'skipped' | 'not_testable';
  evidence?: string;
  recommendation?: string;
  cweOwaspReference?: string;
  meta?: Record<string, unknown>;
}

export interface RefreshToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}