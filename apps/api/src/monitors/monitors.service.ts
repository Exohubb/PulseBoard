import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitorsService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, data: {
    serviceId: string;
    type: string;
    name: string;
    active?: boolean;
    intervalSeconds?: number;
    timeoutMs?: number;
    retryCount?: number;
    failureThreshold?: number;
    recoveryThreshold?: number;
    incidentAutoCreate?: boolean;
  }) {
    const service = await this.prisma.service.findFirst({ where: { id: data.serviceId, workspaceId } });
    if (!service) throw new NotFoundException('Service not found');

    return this.prisma.monitor.create({
      data: {
        workspaceId,
        serviceId: data.serviceId,
        type: data.type,
        name: data.name,
        active: data.active ?? true,
        intervalSeconds: data.intervalSeconds ?? 60,
        timeoutMs: data.timeoutMs ?? 10000,
        retryCount: data.retryCount ?? 2,
        failureThreshold: data.failureThreshold ?? 3,
        recoveryThreshold: data.recoveryThreshold ?? 3,
        incidentAutoCreate: data.incidentAutoCreate ?? true,
      },
      include: { httpConfig: true, wsConfig: true, scanConfig: true },
    });
  }

  async findById(workspaceId: string, monitorId: string) {
    const monitor = await this.prisma.monitor.findFirst({
      where: { id: monitorId, workspaceId },
      include: { httpConfig: true, wsConfig: true, scanConfig: true },
    });
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  async list(workspaceId: string, filters?: { serviceId?: string; type?: string; active?: boolean }) {
    return this.prisma.monitor.findMany({
      where: { workspaceId, ...filters },
      include: { service: true, httpConfig: true, wsConfig: true, scanConfig: true },
      orderBy: { name: 'asc' },
    });
  }

  async update(workspaceId: string, monitorId: string, data: {
    name?: string;
    active?: boolean;
    intervalSeconds?: number;
    timeoutMs?: number;
    retryCount?: number;
    failureThreshold?: number;
    recoveryThreshold?: number;
    incidentAutoCreate?: boolean;
  }) {
    await this.findById(workspaceId, monitorId);
    return this.prisma.monitor.update({ where: { id: monitorId }, data });
  }

  async delete(workspaceId: string, monitorId: string) {
    await this.findById(workspaceId, monitorId);
    return this.prisma.monitor.delete({ where: { id: monitorId } });
  }

  async pause(workspaceId: string, monitorId: string) {
    return this.update(workspaceId, monitorId, { active: false });
  }

  async resume(workspaceId: string, monitorId: string) {
    return this.update(workspaceId, monitorId, { active: true });
  }

  async createHttpConfig(monitorId: string, data: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    expectedStatus?: number;
    expectedJsonPath?: string;
    expectedJsonValue?: string;
    authType?: string;
    authConfig?: Record<string, string>;
    followRedirects?: boolean;
    sslStrict?: boolean;
    regionLabel?: string;
  }) {
    return this.prisma.monitorHttpConfig.upsert({
      where: { monitorId },
      create: {
        monitorId,
        url: data.url,
        method: data.method || 'GET',
        headers: data.headers ? JSON.stringify(data.headers) : '{}',
        body: data.body,
        expectedStatus: data.expectedStatus || 200,
        expectedJsonPath: data.expectedJsonPath,
        expectedJsonValue: data.expectedJsonValue,
        authType: data.authType || 'none',
        authConfig: data.authConfig ? JSON.stringify(data.authConfig) : '{}',
        followRedirects: data.followRedirects ?? true,
        sslStrict: data.sslStrict ?? false,
        regionLabel: data.regionLabel,
      },
      update: {
        url: data.url,
        method: data.method,
        headers: data.headers ? JSON.stringify(data.headers) : undefined,
        body: data.body,
        expectedStatus: data.expectedStatus,
        expectedJsonPath: data.expectedJsonPath,
        expectedJsonValue: data.expectedJsonValue,
        authType: data.authType,
        authConfig: data.authConfig ? JSON.stringify(data.authConfig) : undefined,
        followRedirects: data.followRedirects,
        sslStrict: data.sslStrict,
        regionLabel: data.regionLabel,
      },
    });
  }

  async createWsConfig(monitorId: string, data: {
    url: string;
    headers?: Record<string, string>;
    authType?: string;
    authConfig?: Record<string, string>;
    connectTimeoutMs?: number;
    expectWelcomeMessage?: boolean;
    welcomeMatchType?: string;
    welcomeMatchValue?: string;
    subscribeMessage?: string;
    expectedResponseEvent?: string;
    pingMessage?: string;
    heartbeatTimeoutMs?: number;
  }) {
    return this.prisma.monitorWsConfig.upsert({
      where: { monitorId },
      create: {
        monitorId,
        url: data.url,
        headers: data.headers ? JSON.stringify(data.headers) : '{}',
        authType: data.authType || 'none',
        authConfig: data.authConfig ? JSON.stringify(data.authConfig) : '{}',
        connectTimeoutMs: data.connectTimeoutMs || 5000,
        expectWelcomeMessage: data.expectWelcomeMessage ?? false,
        welcomeMatchType: data.welcomeMatchType,
        welcomeMatchValue: data.welcomeMatchValue,
        subscribeMessage: data.subscribeMessage,
        expectedResponseEvent: data.expectedResponseEvent,
        pingMessage: data.pingMessage,
        heartbeatTimeoutMs: data.heartbeatTimeoutMs || 30000,
      },
      update: {
        url: data.url,
        headers: data.headers ? JSON.stringify(data.headers) : undefined,
        authType: data.authType,
        authConfig: data.authConfig ? JSON.stringify(data.authConfig) : undefined,
        connectTimeoutMs: data.connectTimeoutMs,
        expectWelcomeMessage: data.expectWelcomeMessage,
        welcomeMatchType: data.welcomeMatchType,
        welcomeMatchValue: data.welcomeMatchValue,
        subscribeMessage: data.subscribeMessage,
        expectedResponseEvent: data.expectedResponseEvent,
        pingMessage: data.pingMessage,
        heartbeatTimeoutMs: data.heartbeatTimeoutMs,
      },
    });
  }

  async createScanConfig(monitorId: string, data: {
    url: string;
    headers?: Record<string, string>;
    authType?: string;
    authConfig?: Record<string, string>;
    scanMode?: string;
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
  }) {
    return this.prisma.monitorScanConfig.upsert({
      where: { monitorId },
      create: {
        monitorId,
        url: data.url,
        headers: data.headers ? JSON.stringify(data.headers) : '{}',
        authType: data.authType || 'none',
        authConfig: data.authConfig ? JSON.stringify(data.authConfig) : '{}',
        scanMode: data.scanMode || 'passive',
        maxDurationMs: data.maxDurationMs || 30000,
        maxMessages: data.maxMessages || 50,
        allowOriginChecks: data.allowOriginChecks ?? true,
        allowSchemaFuzz: data.allowSchemaFuzz ?? false,
        allowAuthChecks: data.allowAuthChecks ?? true,
        allowRateLimitProbe: data.allowRateLimitProbe ?? true,
        allowEventEnumProbe: data.allowEventEnumProbe ?? true,
        allowPayloadSizeProbe: data.allowPayloadSizeProbe ?? true,
        legalAcknowledged: data.legalAcknowledged ?? false,
        ownershipConfirmed: data.ownershipConfirmed ?? false,
      },
      update: {
        url: data.url,
        headers: data.headers ? JSON.stringify(data.headers) : undefined,
        authType: data.authType,
        authConfig: data.authConfig ? JSON.stringify(data.authConfig) : undefined,
        scanMode: data.scanMode,
        maxDurationMs: data.maxDurationMs,
        maxMessages: data.maxMessages,
        allowOriginChecks: data.allowOriginChecks,
        allowSchemaFuzz: data.allowSchemaFuzz,
        allowAuthChecks: data.allowAuthChecks,
        allowRateLimitProbe: data.allowRateLimitProbe,
        allowEventEnumProbe: data.allowEventEnumProbe,
        allowPayloadSizeProbe: data.allowPayloadSizeProbe,
        legalAcknowledged: data.legalAcknowledged,
        ownershipConfirmed: data.ownershipConfirmed,
      },
    });
  }

  async getDueMonitors(limit: number = 50) {
    const now = new Date();
    return this.prisma.monitor.findMany({
      where: {
        active: true,
        maintenanceMode: false,
        OR: [
          { lastRunAt: null },
          {
            lastRunAt: {
              lte: new Date(now.getTime() - 60000), // Due if last run was over 1 minute ago
            },
          },
        ],
      },
      include: {
        httpConfig: true,
        wsConfig: true,
        scanConfig: true,
        service: true,
      },
      take: limit,
    });
  }

  async updateLastRun(monitorId: string, status: string) {
    return this.prisma.monitor.update({
      where: { id: monitorId },
      data: { lastRunAt: new Date(), lastStatus: status },
    });
  }
}