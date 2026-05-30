import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { name: string; slug: string; description?: string }) {
    const existing = await this.prisma.workspace.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException('Slug already taken');

    return this.prisma.workspace.create({
      data: {
        ...data,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: { members: { include: { user: true } } },
    });
  }

  async findBySlug(slug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      include: { members: { include: { user: true } } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async findById(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async findUserWorkspace(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findFirst({
      where: { userId, workspaceId },
      include: { workspace: true },
    });
    if (!membership) throw new ForbiddenException('Access denied');
    return membership;
  }

  async listUserWorkspaces(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });
  }

  async update(userId: string, workspaceId: string, data: { name?: string; description?: string; logoUrl?: string; accentColor?: string }) {
    await this.findUserWorkspace(userId, workspaceId);
    return this.prisma.workspace.update({ where: { id: workspaceId }, data });
  }

  async addMember(ownerId: string, workspaceId: string, email: string, role: string) {
    await this.findUserWorkspace(ownerId, workspaceId);

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (existing) throw new ConflictException('User already member');

    return this.prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role },
      include: { user: true },
    });
  }

  async removeMember(ownerId: string, workspaceId: string, userId: string) {
    await this.findUserWorkspace(ownerId, workspaceId);

    const membership = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (!membership) throw new NotFoundException('Member not found');
    if (membership.role === 'owner') throw new ForbiddenException('Cannot remove owner');

    return this.prisma.workspaceMember.delete({ where: { id: membership.id } });
  }

  async updateMemberRole(ownerId: string, workspaceId: string, userId: string, role: string) {
    await this.findUserWorkspace(ownerId, workspaceId);

    return this.prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
    });
  }

  async removeWorkspace(userId: string, workspaceId: string) {
    const membership = await this.findUserWorkspace(userId, workspaceId);
    if (membership.role !== 'owner') {
      throw new ForbiddenException('Only owners can delete workspaces');
    }
    return this.prisma.workspace.delete({ where: { id: workspaceId } });
  }

  async getStats(workspaceId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [totalServices, totalMonitors, activeIncidents, failingMonitors, recent] = await Promise.all([
      this.prisma.service.count({ where: { workspaceId } }),
      this.prisma.monitor.count({ where: { workspaceId } }),
      this.prisma.incident.count({
        where: { workspaceId, status: { in: ['open', 'investigating', 'identified', 'monitoring'] } },
      }),
      this.prisma.monitor.count({ where: { workspaceId, lastStatus: 'down' } }),
      this.prisma.checkRun.findMany({
        where: { workspaceId, startedAt: { gte: since } },
        select: { success: true, latencyTotalMs: true },
      }),
    ]);

    const total = recent.length;
    const succeeded = recent.filter(r => r.success).length;
    const latencies = recent.map(r => r.latencyTotalMs).filter((n): n is number => typeof n === 'number');
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    const uptime24h = total === 0 ? 100 : Number(((succeeded / total) * 100).toFixed(2));

    return {
      totalServices,
      totalMonitors,
      activeIncidents,
      failingMonitors,
      avgLatency,
      uptime24h,
    };
  }
}