import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '@pulseboard/shared-utils';

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, userId: string | null, data: {
    title: string;
    severity: string;
    source?: string;
    serviceIds?: string[];
    monitorIds?: string[];
    impactSummary?: string;
  }) {
    const slug = generateSlug(data.title) + '-' + Date.now().toString(36);

    const incident = await this.prisma.incident.create({
      data: {
        workspaceId,
        title: data.title,
        slug,
        severity: data.severity,
        status: 'open',
        source: data.source || 'manual',
        createdByUserId: userId || undefined,
        impactSummary: data.impactSummary,
        serviceLinks: {
          create: [
            ...(data.serviceIds?.map(id => ({ serviceId: id })) || []),
            ...(data.monitorIds?.map(id => ({ monitorId: id })) || []),
          ],
        },
      },
      include: {
        updates: { include: { createdByUser: true }, orderBy: { createdAt: 'asc' } },
        serviceLinks: true,
      },
    });

    await this.prisma.incidentUpdate.create({
      data: {
        incidentId: incident.id,
        type: 'created',
        message: 'Incident created',
        createdByUserId: userId || undefined,
        internalOnly: false,
      },
    });

    return incident;
  }

  async findById(workspaceId: string, incidentId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, workspaceId },
      include: {
        updates: { include: { createdByUser: true }, orderBy: { createdAt: 'asc' } },
        serviceLinks: { include: { service: true, monitor: true } },
      },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    return incident;
  }

  async list(workspaceId: string, filters?: { status?: string[]; severity?: string[]; serviceId?: string }) {
    return this.prisma.incident.findMany({
      where: {
        workspaceId,
        ...(filters?.status && { status: { in: filters.status } }),
        ...(filters?.severity && { severity: { in: filters.severity } }),
        ...(filters?.serviceId && {
          serviceLinks: { some: { serviceId: filters.serviceId } },
        }),
      },
      include: {
        updates: { orderBy: { createdAt: 'desc' }, take: 1 },
        serviceLinks: { include: { service: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(workspaceId: string, incidentId: string, userId: string | null, data: {
    title?: string;
    severity?: string;
    status?: string;
    assignedToUserId?: string;
    impactSummary?: string;
    internalSummary?: string;
    publicSummary?: string;
    rootCause?: string;
  }) {
    const existing = await this.findById(workspaceId, incidentId);

    const updateData: any = { ...data };
    if (data.status === 'resolved' && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (data.status === 'closed' && !existing.closedAt) {
      updateData.closedAt = new Date();
    }

    const incident = await this.prisma.incident.update({
      where: { id: incidentId },
      data: updateData,
      include: {
        updates: { include: { createdByUser: true }, orderBy: { createdAt: 'asc' } },
        serviceLinks: true,
      },
    });

    if (data.status) {
      await this.prisma.incidentUpdate.create({
        data: {
          incidentId,
          type: 'status_changed',
          message: `Status changed to ${data.status}`,
          createdByUserId: userId || undefined,
          internalOnly: false,
        },
      });
    }

    return incident;
  }

  async addUpdate(workspaceId: string, incidentId: string, userId: string | null, data: {
    type: string;
    message: string;
    internalOnly?: boolean;
    meta?: Record<string, any>;
  }) {
    await this.findById(workspaceId, incidentId);

    return this.prisma.incidentUpdate.create({
      data: {
        incidentId,
        type: data.type,
        message: data.message,
        internalOnly: data.internalOnly ?? false,
        createdByUserId: userId || undefined,
        meta: data.meta ? JSON.stringify(data.meta) : undefined,
      },
      include: { createdByUser: true },
    });
  }

  async resolve(workspaceId: string, incidentId: string, userId: string | null, publicSummary?: string) {
    return this.update(workspaceId, incidentId, userId, {
      status: 'resolved',
      publicSummary,
    });
  }

  async close(workspaceId: string, incidentId: string, userId: string | null) {
    return this.update(workspaceId, incidentId, userId, { status: 'closed' });
  }

  async getActiveIncidents(workspaceId: string) {
    return this.list(workspaceId, {
      status: ['open', 'investigating', 'identified', 'monitoring'],
    });
  }

  async getIncidentTimeline(workspaceId: string, incidentId: string) {
    const incident = await this.findById(workspaceId, incidentId);
    return incident.updates;
  }

  async getIncidentsByService(workspaceId: string, serviceId: string) {
    return this.prisma.incident.findMany({
      where: {
        workspaceId,
        serviceLinks: { some: { serviceId } },
      },
      include: { updates: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async autoCreateIncident(workspaceId: string, monitorId: string, checkRunId: string, reason: string) {
    const monitor = await this.prisma.monitor.findFirst({
      where: { id: monitorId, workspaceId },
      include: { service: true },
    });
    if (!monitor) return null;

    const title = `Incident: ${monitor.name} is down`;
    const severity = monitor.consecutiveFailures >= 5 ? 'critical' : 'high';

    return this.create(workspaceId, null, {
      title,
      severity,
      source: 'auto',
      monitorIds: [monitorId],
      impactSummary: reason,
    });
  }

  async autoResolveIfStable(workspaceId: string, monitorId: string) {
    const monitor = await this.prisma.monitor.findFirst({
      where: { id: monitorId, workspaceId },
    });
    if (!monitor) return;

    if (monitor.consecutiveSuccesses >= monitor.recoveryThreshold) {
      const openIncidents = await this.prisma.incident.findMany({
        where: {
          workspaceId,
          status: { in: ['open', 'investigating', 'identified', 'monitoring'] },
          serviceLinks: { some: { monitorId } },
        },
      });

      for (const incident of openIncidents) {
        await this.resolve(workspaceId, incident.id, null, 'Monitor recovered after stable period');
      }
    }
  }
}