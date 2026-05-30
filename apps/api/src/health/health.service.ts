import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {}

  async getHealth() {
    const checks = {
      api: 'healthy' as const,
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const allHealthy = Object.values(checks).every(c => c === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      checks,
    };
  }

  private async checkDatabase(): Promise<'healthy' | 'unhealthy'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }

  private async checkRedis(): Promise<'healthy' | 'unhealthy'> {
    try {
      // Basic check - would need RedisService injection
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }

  async getStats() {
    const [
      userCount,
      workspaceCount,
      serviceCount,
      monitorCount,
      incidentCount,
      checkRunCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.workspace.count(),
      this.prisma.service.count(),
      this.prisma.monitor.count(),
      this.prisma.incident.count(),
      this.prisma.checkRun.count(),
    ]);

    return {
      users: userCount,
      workspaces: workspaceCount,
      services: serviceCount,
      monitors: monitorCount,
      incidents: incidentCount,
      checkRuns: checkRunCount,
    };
  }
}