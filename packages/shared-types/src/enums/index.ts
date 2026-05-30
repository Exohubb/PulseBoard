export enum WorkspaceRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum ServiceEnvironment {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
}

export enum MonitorType {
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  WEBSOCKET_SCAN = 'websocket_scan',
}

export enum MonitorStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded',
  PAUSED = 'paused',
  MAINTENANCE = 'maintenance',
  PENDING = 'pending',
}

export enum CheckStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  TIMEOUT = 'timeout',
  ERROR = 'error',
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  MONITORING = 'monitoring',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum IncidentSource {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export enum AlertChannelType {
  SLACK = 'slack',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
}

export enum AlertPolicyEvent {
  FIRST_FAILURE = 'first_failure',
  INCIDENT_CREATED = 'incident_created',
  SEVERITY_CHANGED = 'severity_changed',
  RECOVERY = 'recovery',
}

export enum AlertDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum ScannerMode {
  PASSIVE = 'passive',
  SAFE_ACTIVE = 'safe_active',
  CUSTOM = 'custom',
}

export enum ScannerFindingStatus {
  PASS = 'pass',
  FAIL = 'fail',
  WARNING = 'warning',
  INFO = 'info',
  SKIPPED = 'skipped',
  NOT_TESTABLE = 'not_testable',
}

export enum ScannerCategory {
  TRANSPORT_SECURITY = 'transport_security',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  INPUT_VALIDATION = 'input_validation',
  RATE_LIMITING = 'rate_limiting',
  ERROR_HANDLING = 'error_handling',
  ORIGIN_HANDLING = 'origin_handling',
  DATA_EXPOSURE = 'data_exposure',
}

export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  WORKSPACE_CREATE = 'workspace_create',
  WORKSPACE_UPDATE = 'workspace_update',
  WORKSPACE_DELETE = 'workspace_delete',
  SERVICE_CREATE = 'service_create',
  SERVICE_UPDATE = 'service_update',
  SERVICE_DELETE = 'service_delete',
  MONITOR_CREATE = 'monitor_create',
  MONITOR_UPDATE = 'monitor_update',
  MONITOR_DELETE = 'monitor_delete',
  MONITOR_PAUSE = 'monitor_pause',
  MONITOR_RESUME = 'monitor_resume',
  INCIDENT_CREATE = 'incident_create',
  INCIDENT_UPDATE = 'incident_update',
  INCIDENT_RESOLVE = 'incident_resolve',
  INCIDENT_CLOSE = 'incident_close',
  ALERT_CHANNEL_CREATE = 'alert_channel_create',
  ALERT_CHANNEL_UPDATE = 'alert_channel_update',
  ALERT_CHANNEL_DELETE = 'alert_channel_delete',
  ALERT_SENT = 'alert_sent',
  STATUS_PAGE_PUBLISH = 'status_page_publish',
  STATUS_PAGE_UNPUBLISH = 'status_page_unpublish',
  SCANNER_RUN = 'scanner_run',
  SETTINGS_UPDATE = 'settings_update',
}

export enum MatchType {
  CONTAINS = 'contains',
  EXACT = 'exact',
  REGEX = 'regex',
  JSON_PATH = 'json_path',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
}

export enum AuthType {
  NONE = 'none',
  BASIC = 'basic',
  BEARER = 'bearer',
  API_KEY = 'api_key',
}

export enum IncidentUpdateType {
  CREATED = 'created',
  CHECK_FAILED = 'check_failed',
  ALERT_TRIGGERED = 'alert_triggered',
  ASSIGNEE_CHANGED = 'assignee_changed',
  NOTE_ADDED = 'note_added',
  STATUS_CHANGED = 'status_changed',
  RECOVERED = 'recovered',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum WebSocketOpcode {
  CONTINUATION = 0,
  TEXT = 1,
  BINARY = 2,
  CLOSE = 8,
  PING = 9,
  PONG = 10,
}