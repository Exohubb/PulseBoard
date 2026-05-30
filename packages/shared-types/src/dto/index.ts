import type {
  WorkspaceRole,
  ServiceEnvironment,
  MonitorType,
  MonitorStatus,
  CheckStatus,
  IncidentSeverity,
  IncidentStatus,
  AlertChannelType,
  AlertPolicyEvent,
  ScannerMode,
  ScannerFindingStatus,
  MatchType,
  HttpMethod,
  AuthType,
  IncidentUpdateType,
} from '../enums';

// Auth
export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

// Workspace
export interface CreateWorkspaceDto {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateWorkspaceDto {
  name?: string;
  description?: string;
  logoUrl?: string;
  accentColor?: string;
}

export interface AddWorkspaceMemberDto {
  email: string;
  role: WorkspaceRole;
}

// Service
export interface CreateServiceDto {
  name: string;
  description?: string;
  environment: ServiceEnvironment;
  ownerTeam?: string;
  tags?: string[];
}

export interface UpdateServiceDto {
  name?: string;
  description?: string;
  environment?: ServiceEnvironment;
  ownerTeam?: string;
  tags?: string[];
}

// Monitor
export interface CreateMonitorDto {
  serviceId: string;
  type: MonitorType;
  name: string;
  active?: boolean;
  intervalSeconds?: number;
  timeoutMs?: number;
  retryCount?: number;
  failureThreshold?: number;
  recoveryThreshold?: number;
  incidentAutoCreate?: boolean;
}

export interface UpdateMonitorDto {
  name?: string;
  active?: boolean;
  intervalSeconds?: number;
  timeoutMs?: number;
  retryCount?: number;
  failureThreshold?: number;
  recoveryThreshold?: number;
  incidentAutoCreate?: boolean;
}

export interface CreateHttpConfigDto {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  expectedStatus?: number;
  expectedJsonPath?: string;
  expectedJsonValue?: string;
  authType?: AuthType;
  authConfig?: {
    username?: string;
    password?: string;
    token?: string;
    headerName?: string;
  };
  followRedirects?: boolean;
  sslStrict?: boolean;
  regionLabel?: string;
}

export interface CreateWsConfigDto {
  url: string;
  headers?: Record<string, string>;
  authType?: AuthType;
  authConfig?: {
    token?: string;
    username?: string;
    password?: string;
  };
  connectTimeoutMs?: number;
  expectWelcomeMessage?: boolean;
  welcomeMatchType?: MatchType;
  welcomeMatchValue?: string;
  subscribeMessage?: string;
  expectedResponseEvent?: string;
  pingMessage?: string;
  heartbeatTimeoutMs?: number;
}

export interface CreateScanConfigDto {
  url: string;
  headers?: Record<string, string>;
  authType?: AuthType;
  authConfig?: {
    token?: string;
  };
  scanMode?: ScannerMode;
  maxDurationMs?: number;
  maxMessages?: number;
  allowOriginChecks?: boolean;
  allowSchemaFuzz?: boolean;
  allowAuthChecks?: boolean;
  allowRateLimitProbe?: boolean;
  allowEventEnumProbe?: boolean;
  allowPayloadSizeProbe?: boolean;
  legalAcknowledged?: boolean;
  ownershipConfirmed?: boolean;
}

// Incident
export interface CreateIncidentDto {
  title: string;
  severity: IncidentSeverity;
  serviceIds?: string[];
  monitorIds?: string[];
  impactSummary?: string;
}

export interface UpdateIncidentDto {
  title?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  assignedToUserId?: string;
  impactSummary?: string;
  internalSummary?: string;
  publicSummary?: string;
  rootCause?: string;
}

export interface CreateIncidentUpdateDto {
  type: IncidentUpdateType;
  message: string;
  internalOnly?: boolean;
}

// Alert Channel
export interface CreateAlertChannelDto {
  type: AlertChannelType;
  name: string;
  config: Record<string, unknown>;
}

export interface UpdateAlertChannelDto {
  name?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

// Alert Policy
export interface CreateAlertPolicyDto {
  name: string;
  event: AlertPolicyEvent;
  severity?: IncidentSeverity;
  serviceTags?: string[];
  alertChannelIds: string[];
  cooldownMinutes?: number;
}

export interface UpdateAlertPolicyDto {
  name?: string;
  enabled?: boolean;
  event?: AlertPolicyEvent;
  severity?: IncidentSeverity;
  serviceTags?: string[];
  alertChannelIds?: string[];
  cooldownMinutes?: number;
}

// Status Page
export interface CreateStatusPageDto {
  name: string;
  slug: string;
  logoUrl?: string;
  accentColor?: string;
  introText?: string;
}

export interface UpdateStatusPageDto {
  name?: string;
  logoUrl?: string;
  accentColor?: string;
  introText?: string;
  published?: boolean;
}

export interface StatusPageComponentDto {
  serviceId?: string;
  monitorId?: string;
  name: string;
  sortOrder?: number;
}

// Maintenance Window
export interface CreateMaintenanceWindowDto {
  serviceId?: string;
  monitorId?: string;
  title: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
}

// Scanner
export interface StartScanDto {
  monitorId?: string;
  url?: string;
  headers?: Record<string, string>;
  authType?: AuthType;
  authConfig?: {
    token?: string;
  };
  scanMode?: ScannerMode;
  maxDurationMs?: number;
  maxMessages?: number;
  allowOriginChecks?: boolean;
  allowSchemaFuzz?: boolean;
  allowAuthChecks?: boolean;
  allowRateLimitProbe?: boolean;
  allowEventEnumProbe?: boolean;
  allowPayloadSizeProbe?: boolean;
}

// Pagination
export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filters
export interface MonitorFiltersDto {
  serviceId?: string;
  type?: MonitorType;
  status?: MonitorStatus;
  active?: boolean;
}

export interface IncidentFiltersDto {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  serviceId?: string;
}

export interface CheckFiltersDto {
  monitorId?: string;
  status?: CheckStatus;
  from?: Date;
  to?: Date;
}

// Dashboard
export interface DashboardStatsDto {
  totalServices: number;
  totalMonitors: number;
  activeIncidents: number;
  failingMonitors: number;
  avgLatency: number;
  uptime24h: number;
}

export interface LatencyDataPointDto {
  timestamp: Date;
  latency: number;
  success: boolean;
}