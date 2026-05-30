import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChecksService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    monitorId: string;
    workspaceId: string;
    success: boolean;
    latencyConnectMs?: number;
    latencyTotalMs?: number;
    statusCode?: number;
    errorCode?: string;
    errorMessage?: string;
    responseSizeBytes?: number;
    availabilityState: string;
    rawMeta?: Record<string, any>;
  }) {
    return this.prisma.checkRun.create({
      data: {
        monitorId: data.monitorId,
        workspaceId: data.workspaceId,
        success: data.success,
        latencyConnectMs: data.latencyConnectMs,
        latencyTotalMs: data.latencyTotalMs,
        statusCode: data.statusCode,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
        responseSizeBytes: data.responseSizeBytes,
        availabilityState: data.availabilityState,
        durationMs: data.latencyTotalMs,
        rawMeta: data.rawMeta ? JSON.stringify(data.rawMeta) : undefined,
      },
      include: { assertions: true },
    });
  }

  async findById(workspaceId: string, checkId: string) {
    const check = await this.prisma.checkRun.findFirst({
      where: { id: checkId, workspaceId },
      include: { assertions: true, monitor: true },
    });
    if (!check) throw new NotFoundException('Check not found');
    return check;
  }

  async list(workspaceId: string, filters?: { monitorId?: string; success?: boolean; from?: Date; to?: Date; limit?: number; offset?: number }) {
    const { limit = 100, offset = 0, ...rest } = filters || {};
    return this.prisma.checkRun.findMany({
      where: {
        workspaceId,
        ...(rest.monitorId && { monitorId: rest.monitorId }),
        ...(rest.success !== undefined && { success: rest.success }),
        ...(rest.from && { startedAt: { gte: rest.from } }),
        ...(rest.to && { startedAt: { lte: rest.to } }),
      },
      include: { monitor: true, assertions: true },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getRecentChecks(workspaceId: string, limit: number = 50) {
    return this.prisma.checkRun.findMany({
      where: { workspaceId },
      include: { monitor: { include: { service: true } } },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async getChecksForMonitor(monitorId: string, limit: number = 100) {
    return this.prisma.checkRun.findMany({
      where: { monitorId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  async getLatencyHistory(monitorId: string, days: number = 7) {
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.checkRun.findMany({
      where: { monitorId, startedAt: { gte: from } },
      select: { startedAt: true, latencyTotalMs: true, success: true },
      orderBy: { startedAt: 'asc' },
    });
  }

  async getUptimeStats(workspaceId: string, monitorId: string) {
    const checks = await this.prisma.checkRun.findMany({
      where: { monitorId },
      orderBy: { startedAt: 'desc' },
      take: 1000,
    });

    const calculateUptime = (periodChecks: typeof checks) => {
      if (periodChecks.length === 0) return 100;
      return Math.round((periodChecks.filter(c => c.success).length / periodChecks.length) * 10000) / 100;
    };

    const now = new Date();
    const checks24h = checks.filter(c => c.startedAt.getTime() > now.getTime() - 24 * 60 * 60 * 1000);
    const checks7d = checks.filter(c => c.startedAt.getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const checks30d = checks.filter(c => c.startedAt.getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      uptime24h: calculateUptime(checks24h),
      uptime7d: calculateUptime(checks7d),
      uptime30d: calculateUptime(checks30d),
      totalChecks: checks.length,
    };
  }

  async cleanupOldChecks(daysOld: number = 30) {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    return this.prisma.checkRun.deleteMany({
      where: { startedAt: { lt: cutoff } },
    });
  }

  async delete(workspaceId: string, checkId: string) {
    const check = await this.prisma.checkRun.findFirst({
      where: { id: checkId, workspaceId },
    });
    if (!check) throw new NotFoundException('Check not found');
    return this.prisma.checkRun.delete({ where: { id: checkId } });
  }

  async deleteMany(workspaceId: string, checkIds: string[]) {
    return this.prisma.checkRun.deleteMany({
      where: { id: { in: checkIds }, workspaceId },
    });
  }

  async deleteByMonitor(workspaceId: string, monitorId: string) {
    return this.prisma.checkRun.deleteMany({
      where: { monitorId, workspaceId },
    });
  }
}