-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "ownerTeam" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monitor" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 60,
    "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "failureThreshold" INTEGER NOT NULL DEFAULT 3,
    "recoveryThreshold" INTEGER NOT NULL DEFAULT 3,
    "slowThresholdMs" INTEGER NOT NULL DEFAULT 1000,
    "incidentAutoCreate" BOOLEAN NOT NULL DEFAULT true,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorHttpConfig" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "headers" TEXT NOT NULL DEFAULT '{}',
    "body" TEXT,
    "expectedStatus" INTEGER NOT NULL DEFAULT 200,
    "expectedJsonPath" TEXT,
    "expectedJsonValue" TEXT,
    "authType" TEXT NOT NULL DEFAULT 'none',
    "authConfig" TEXT NOT NULL DEFAULT '{}',
    "followRedirects" BOOLEAN NOT NULL DEFAULT true,
    "sslStrict" BOOLEAN NOT NULL DEFAULT false,
    "regionLabel" TEXT,

    CONSTRAINT "MonitorHttpConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorWsConfig" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" TEXT NOT NULL DEFAULT '{}',
    "authType" TEXT NOT NULL DEFAULT 'none',
    "authConfig" TEXT NOT NULL DEFAULT '{}',
    "connectTimeoutMs" INTEGER NOT NULL DEFAULT 5000,
    "expectWelcomeMessage" BOOLEAN NOT NULL DEFAULT false,
    "welcomeMatchType" TEXT,
    "welcomeMatchValue" TEXT,
    "subscribeMessage" TEXT,
    "expectedResponseEvent" TEXT,
    "pingMessage" TEXT,
    "heartbeatTimeoutMs" INTEGER NOT NULL DEFAULT 30000,

    CONSTRAINT "MonitorWsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitorScanConfig" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "headers" TEXT NOT NULL DEFAULT '{}',
    "authType" TEXT NOT NULL DEFAULT 'none',
    "authConfig" TEXT NOT NULL DEFAULT '{}',
    "scanMode" TEXT NOT NULL DEFAULT 'passive',
    "maxDurationMs" INTEGER NOT NULL DEFAULT 30000,
    "maxMessages" INTEGER NOT NULL DEFAULT 50,
    "allowOriginChecks" BOOLEAN NOT NULL DEFAULT true,
    "allowSchemaFuzz" BOOLEAN NOT NULL DEFAULT false,
    "allowAuthChecks" BOOLEAN NOT NULL DEFAULT true,
    "allowRateLimitProbe" BOOLEAN NOT NULL DEFAULT true,
    "allowEventEnumProbe" BOOLEAN NOT NULL DEFAULT true,
    "allowPayloadSizeProbe" BOOLEAN NOT NULL DEFAULT true,
    "legalAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "ownershipConfirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MonitorScanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "statusCode" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "latencyConnectMs" INTEGER,
    "latencyTotalMs" INTEGER,
    "responseSizeBytes" INTEGER,
    "availabilityState" TEXT NOT NULL DEFAULT 'pending',
    "rawMeta" TEXT,

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckAssertion" (
    "id" TEXT NOT NULL,
    "checkRunId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "name" TEXT NOT NULL,
    "expected" TEXT,
    "actual" TEXT,

    CONSTRAINT "CheckAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdByUserId" TEXT,
    "assignedToUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "impactSummary" TEXT,
    "internalSummary" TEXT,
    "publicSummary" TEXT,
    "rootCause" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentUpdate" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "internalOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentServiceLink" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "serviceId" TEXT,
    "monitorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentServiceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertChannel" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertPolicy" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "event" TEXT NOT NULL,
    "severity" TEXT,
    "serviceTags" TEXT NOT NULL DEFAULT '[]',
    "alertChannelIds" TEXT NOT NULL DEFAULT '[]',
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "alertPolicyId" TEXT NOT NULL,
    "alertChannelId" TEXT NOT NULL,
    "incidentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "responseCode" INTEGER,
    "responseBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPage" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#6366f1',
    "introText" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "customDomain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatusPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusPageComponent" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "serviceId" TEXT,
    "monitorId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'up',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StatusPageComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceWindow" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "serviceId" TEXT,
    "monitorId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "meta" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerRun" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "monitorId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "verdict" TEXT NOT NULL,
    "summary" TEXT,
    "meta" TEXT,

    CONSTRAINT "ScannerRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScannerFinding" (
    "id" TEXT NOT NULL,
    "scannerRunId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" TEXT,
    "recommendation" TEXT,
    "cweOwaspReference" TEXT,
    "meta" TEXT,

    CONSTRAINT "ScannerFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'read',
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Service_workspaceId_idx" ON "Service"("workspaceId");

-- CreateIndex
CREATE INDEX "Service_status_idx" ON "Service"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Service_workspaceId_slug_key" ON "Service"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "Monitor_workspaceId_idx" ON "Monitor"("workspaceId");

-- CreateIndex
CREATE INDEX "Monitor_serviceId_idx" ON "Monitor"("serviceId");

-- CreateIndex
CREATE INDEX "Monitor_type_idx" ON "Monitor"("type");

-- CreateIndex
CREATE INDEX "Monitor_active_idx" ON "Monitor"("active");

-- CreateIndex
CREATE INDEX "Monitor_lastRunAt_idx" ON "Monitor"("lastRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorHttpConfig_monitorId_key" ON "MonitorHttpConfig"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorWsConfig_monitorId_key" ON "MonitorWsConfig"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "MonitorScanConfig_monitorId_key" ON "MonitorScanConfig"("monitorId");

-- CreateIndex
CREATE INDEX "CheckRun_monitorId_startedAt_idx" ON "CheckRun"("monitorId", "startedAt");

-- CreateIndex
CREATE INDEX "CheckRun_workspaceId_startedAt_idx" ON "CheckRun"("workspaceId", "startedAt");

-- CreateIndex
CREATE INDEX "CheckRun_success_idx" ON "CheckRun"("success");

-- CreateIndex
CREATE INDEX "Incident_workspaceId_idx" ON "Incident"("workspaceId");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_severity_idx" ON "Incident"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_workspaceId_slug_key" ON "Incident"("workspaceId", "slug");

-- CreateIndex
CREATE INDEX "IncidentUpdate_incidentId_idx" ON "IncidentUpdate"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentServiceLink_incidentId_idx" ON "IncidentServiceLink"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentServiceLink_serviceId_idx" ON "IncidentServiceLink"("serviceId");

-- CreateIndex
CREATE INDEX "IncidentServiceLink_monitorId_idx" ON "IncidentServiceLink"("monitorId");

-- CreateIndex
CREATE INDEX "AlertChannel_workspaceId_idx" ON "AlertChannel"("workspaceId");

-- CreateIndex
CREATE INDEX "AlertPolicy_workspaceId_idx" ON "AlertPolicy"("workspaceId");

-- CreateIndex
CREATE INDEX "AlertDelivery_alertPolicyId_idx" ON "AlertDelivery"("alertPolicyId");

-- CreateIndex
CREATE INDEX "AlertDelivery_alertChannelId_idx" ON "AlertDelivery"("alertChannelId");

-- CreateIndex
CREATE INDEX "AlertDelivery_status_idx" ON "AlertDelivery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StatusPage_slug_key" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "StatusPage_workspaceId_idx" ON "StatusPage"("workspaceId");

-- CreateIndex
CREATE INDEX "StatusPage_slug_idx" ON "StatusPage"("slug");

-- CreateIndex
CREATE INDEX "StatusPageComponent_statusPageId_idx" ON "StatusPageComponent"("statusPageId");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_workspaceId_idx" ON "MaintenanceWindow"("workspaceId");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_serviceId_idx" ON "MaintenanceWindow"("serviceId");

-- CreateIndex
CREATE INDEX "MaintenanceWindow_monitorId_idx" ON "MaintenanceWindow"("monitorId");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_idx" ON "AuditLog"("workspaceId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ScannerRun_workspaceId_idx" ON "ScannerRun"("workspaceId");

-- CreateIndex
CREATE INDEX "ScannerRun_monitorId_idx" ON "ScannerRun"("monitorId");

-- CreateIndex
CREATE INDEX "ScannerFinding_scannerRunId_idx" ON "ScannerFinding"("scannerRunId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_tokenHash_key" ON "ApiKey"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_tokenHash_idx" ON "ApiKey"("tokenHash");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monitor" ADD CONSTRAINT "Monitor_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorHttpConfig" ADD CONSTRAINT "MonitorHttpConfig_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorWsConfig" ADD CONSTRAINT "MonitorWsConfig_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonitorScanConfig" ADD CONSTRAINT "MonitorScanConfig_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckAssertion" ADD CONSTRAINT "CheckAssertion_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES "CheckRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentUpdate" ADD CONSTRAINT "IncidentUpdate_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentUpdate" ADD CONSTRAINT "IncidentUpdate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentServiceLink" ADD CONSTRAINT "IncidentServiceLink_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentServiceLink" ADD CONSTRAINT "IncidentServiceLink_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentServiceLink" ADD CONSTRAINT "IncidentServiceLink_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertChannel" ADD CONSTRAINT "AlertChannel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertPolicy" ADD CONSTRAINT "AlertPolicy_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_alertPolicyId_fkey" FOREIGN KEY ("alertPolicyId") REFERENCES "AlertPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_alertChannelId_fkey" FOREIGN KEY ("alertChannelId") REFERENCES "AlertChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPage" ADD CONSTRAINT "StatusPage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageComponent" ADD CONSTRAINT "StatusPageComponent_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageComponent" ADD CONSTRAINT "StatusPageComponent_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusPageComponent" ADD CONSTRAINT "StatusPageComponent_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceWindow" ADD CONSTRAINT "MaintenanceWindow_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerRun" ADD CONSTRAINT "ScannerRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerRun" ADD CONSTRAINT "ScannerRun_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannerFinding" ADD CONSTRAINT "ScannerFinding_scannerRunId_fkey" FOREIGN KEY ("scannerRunId") REFERENCES "ScannerRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
