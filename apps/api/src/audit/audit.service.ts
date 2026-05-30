import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    workspaceId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    meta?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: data.workspaceId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        meta: data.meta ? JSON.stringify(data.meta) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async list(workspaceId: string, filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }) {
    const { limit = 100, offset = 0, ...rest } = filters || {};
    return this.prisma.auditLog.findMany({
      where: {
        workspaceId,
        ...(rest.userId && { userId: rest.userId }),
        ...(rest.action && { action: rest.action }),
        ...(rest.entityType && { entityType: rest.entityType }),
        ...(rest.from && { createdAt: { gte: rest.from } }),
        ...(rest.to && { createdAt: { lte: rest.to } }),
      },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  async getActions() {
    return [
      'login', 'logout', 'workspace_create', 'workspace_update', 'workspace_delete',
      'service_create', 'service_update', 'service_delete',
      'monitor_create', 'monitor_update', 'monitor_delete', 'monitor_pause', 'monitor_resume',
      'incident_create', 'incident_update', 'incident_resolve', 'incident_close',
      'alert_channel_create', 'alert_channel_update', 'alert_channel_delete',
      'alert_sent', 'status_page_publish', 'status_page_unpublish',
      'scanner_run', 'settings_update',
    ];
  }
}