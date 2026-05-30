import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatusPagesService {
  constructor(private prisma: PrismaService) {}

  async create(workspaceId: string, data: {
    name: string;
    slug: string;
    logoUrl?: string;
    accentColor?: string;
    introText?: string;
  }) {
    return this.prisma.statusPage.create({
      data: {
        workspaceId,
        ...data,
        published: false,
      },
      include: { components: { include: { service: true, monitor: true } } },
    });
  }

  async findById(workspaceId: string, pageId: string) {
    const page = await this.prisma.statusPage.findFirst({
      where: { id: pageId, workspaceId },
      include: { components: { include: { service: true, monitor: true } } },
    });
    if (!page) throw new NotFoundException('Status page not found');
    return page;
  }

  async findBySlug(slug: string) {
    return this.prisma.statusPage.findUnique({
      where: { slug },
      include: { components: { include: { service: true, monitor: true } } },
    });
  }

  async list(workspaceId: string) {
    return this.prisma.statusPage.findMany({
      where: { workspaceId },
      include: { components: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(workspaceId: string, pageId: string, data: {
    name?: string;
    logoUrl?: string;
    accentColor?: string;
    introText?: string;
    published?: boolean;
    customDomain?: string;
  }) {
    await this.findById(workspaceId, pageId);
    return this.prisma.statusPage.update({ where: { id: pageId }, data });
  }

  async delete(workspaceId: string, pageId: string) {
    await this.findById(workspaceId, pageId);
    return this.prisma.statusPage.delete({ where: { id: pageId } });
  }

  async addComponent(pageId: string, data: {
    serviceId?: string;
    monitorId?: string;
    name: string;
    sortOrder?: number;
  }) {
    return this.prisma.statusPageComponent.create({
      data: {
        statusPageId: pageId,
        ...data,
      },
    });
  }

  async updateComponent(componentId: string, data: {
    name?: string;
    sortOrder?: number;
  }) {
    return this.prisma.statusPageComponent.update({
      where: { id: componentId },
      data,
    });
  }

  async deleteComponent(componentId: string) {
    return this.prisma.statusPageComponent.delete({ where: { id: componentId } });
  }

  async getPublicStatusPage(slug: string) {
    const page = await this.prisma.statusPage.findUnique({
      where: { slug, published: true },
      include: {
        components: {
          include: {
            service: { include: { monitors: true } },
            monitor: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!page) return null;

    // Calculate status for each component
    const componentsWithStatus = page.components.map(component => {
      let status = 'up';
      let uptime = 100;

      if (component.monitor) {
        status = component.monitor.lastStatus || 'up';
      } else if (component.service) {
        const monitors = component.service.monitors;
        if (monitors.length > 0) {
          const failingCount = monitors.filter(m => m.lastStatus === 'down').length;
          if (failingCount > 0) status = 'degraded';
        }
      }

      return { ...component, status };
    });

    // Get active incidents
    const activeIncidents = await this.prisma.incident.findMany({
      where: {
        workspaceId: page.workspaceId,
        status: { in: ['open', 'investigating', 'identified', 'monitoring'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get recent resolved incidents
    const recentIncidents = await this.prisma.incident.findMany({
      where: {
        workspaceId: page.workspaceId,
        status: { in: ['resolved', 'closed'] },
      },
      orderBy: { resolvedAt: 'desc' },
      take: 10,
    });

    // Get maintenance windows
    const now = new Date();
    const upcomingMaintenance = await this.prisma.maintenanceWindow.findMany({
      where: {
        workspaceId: page.workspaceId,
        startsAt: { gt: now },
      },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });

    // Calculate overall status
    const overallStatus = componentsWithStatus.some(c => c.status === 'down')
      ? 'degraded'
      : componentsWithStatus.some(c => c.status === 'degraded')
        ? 'degraded'
        : 'operational';

    return {
      id: page.id,
      name: page.name,
      slug: page.slug,
      logoUrl: page.logoUrl,
      accentColor: page.accentColor,
      introText: page.introText,
      overallStatus,
      components: componentsWithStatus,
      activeIncidents: activeIncidents.map(i => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        createdAt: i.createdAt,
        startedAt: i.startedAt,
        impactSummary: i.impactSummary,
        publicSummary: i.publicSummary,
      })),
      recentIncidents: recentIncidents.map(i => ({
        id: i.id,
        title: i.title,
        severity: i.severity,
        status: i.status,
        createdAt: i.createdAt,
        resolvedAt: i.resolvedAt,
        publicSummary: i.publicSummary,
      })),
      upcomingMaintenance: upcomingMaintenance.map(m => ({
        id: m.id,
        title: m.title,
        startsAt: m.startsAt,
        endsAt: m.endsAt,
      })),
      updatedAt: page.updatedAt,
    };
  }

  async updateComponentStatuses(workspaceId: string) {
    const pages = await this.prisma.statusPage.findMany({
      where: { workspaceId, published: true },
      include: { components: { include: { service: { include: { monitors: true } }, monitor: true } } },
    });

    for (const page of pages) {
      for (const component of page.components) {
        let status = 'up';

        if (component.monitor) {
          status = component.monitor.lastStatus || 'up';
        } else if (component.service) {
          const failingMonitors = component.service.monitors?.filter(m => m.lastStatus === 'down').length || 0;
          if (failingMonitors > 0) status = 'degraded';
        }

        await this.prisma.statusPageComponent.update({
          where: { id: component.id },
          data: { status },
        });
      }
    }
  }
}