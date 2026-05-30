import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '@pulseboard/shared-utils';

@Injectable()
export class ServicesService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, userId: string, data: { name: string; description?: string; environment?: string; ownerTeam?: string; tags?: string[] }) {
    const slug = generateSlug(data.name);

    const existing = await this.prisma.service.findFirst({ where: { workspaceId, slug } });
    if (existing) throw new ConflictException('Service with this name already exists');

    return this.prisma.service.create({
      data: {
        workspaceId,
        name: data.name,
        slug,
        description: data.description,
        environment: data.environment || 'production',
        ownerTeam: data.ownerTeam,
        tags: JSON.stringify(data.tags || []),
      },
      include: { monitors: true },
    });
  }

  async findById(workspaceId: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, workspaceId },
      include: {
        monitors: {
          include: { httpConfig: true, wsConfig: true, scanConfig: true },
        },
      },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async list(workspaceId: string, filters?: { environment?: string; status?: string; tags?: string[] }) {
    return this.prisma.service.findMany({
      where: {
        workspaceId,
        ...(filters?.environment && { environment: filters.environment }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        monitors: { select: { id: true, name: true, type: true, active: true, lastStatus: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(workspaceId: string, serviceId: string, data: { name?: string; description?: string; environment?: string; ownerTeam?: string; tags?: string[] }) {
    await this.findById(workspaceId, serviceId);

    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = generateSlug(data.name);
    }

    return this.prisma.service.update({
      where: { id: serviceId },
      data: updateData,
    });
  }

  async delete(workspaceId: string, serviceId: string) {
    await this.findById(workspaceId, serviceId);
    return this.prisma.service.delete({ where: { id: serviceId } });
  }

  async getServiceStats(workspaceId: string, serviceId: string) {
    const service = await this.findById(workspaceId, serviceId);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [checks24h, checks7d, checks30d] = await Promise.all([
      this.prisma.checkRun.findMany({
        where: { monitor: { serviceId }, startedAt: { gte: oneDayAgo } },
        select: { success: true, latencyTotalMs: true },
      }),
      this.prisma.checkRun.findMany({
        where: { monitor: { serviceId }, startedAt: { gte: sevenDaysAgo } },
        select: { success: true, latencyTotalMs: true },
      }),
      this.prisma.checkRun.findMany({
        where: { monitor: { serviceId }, startedAt: { gte: thirtyDaysAgo } },
        select: { success: true, latencyTotalMs: true },
      }),
    ]);

    const calculateUptime = (checks: { success: boolean }[]) => {
      if (checks.length === 0) return 100;
      return Math.round((checks.filter(c => c.success).length / checks.length) * 10000) / 100;
    };

    const calculateAvgLatency = (checks: { latencyTotalMs: number | null }[]) => {
      const latencies = checks.filter(c => c.latencyTotalMs).map(c => c.latencyTotalMs!);
      if (latencies.length === 0) return 0;
      return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    };

    return {
      monitorCount: service.monitors.length,
      uptime24h: calculateUptime(checks24h),
      uptime7d: calculateUptime(checks7d),
      uptime30d: calculateUptime(checks30d),
      avgLatency24h: calculateAvgLatency(checks24h),
      checkCount24h: checks24h.length,
    };
  }

  async updateStatus(workspaceId: string, serviceId: string, status: string) {
    return this.prisma.service.update({
      where: { id: serviceId },
      data: { status },
    });
  }
}