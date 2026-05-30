import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { CheckExecutor } from './check-executor.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly lockKey = 'scheduler:monitor-check:lock';
  private readonly lockTtl: number;
  private isLeader = false;
  private hasRedis = true;

  constructor(
    private redis: RedisService,
    private checkExecutor: CheckExecutor,
    private prisma: PrismaService,
    private config: ConfigService
  ) {
    this.lockTtl = parseInt(this.config.get('SCHEDULER_LOCK_TTL_MS') || '30000');
  }

  async onModuleInit() {
    this.logger.log('Scheduler service initialized');
    await this.tryAcquireLeadership();
  }

  private async tryAcquireLeadership() {
    try {
      const acquired = await this.redis.acquireLock(this.lockKey, this.lockTtl);
      if (acquired) {
        this.isLeader = true;
        this.hasRedis = true;
        this.logger.log('Acquired scheduler leadership');
        this.scheduleLockRefresh();
      } else {
        // Lock not acquired - either another instance has it or Redis isn't available
        // In single-instance mode, try to run as leader anyway
        this.logger.warn('Could not acquire scheduler lock, attempting single-instance mode');
        this.isLeader = true;
        this.hasRedis = false;
        this.logger.log('Running scheduler in single-instance mode');
      }
    } catch (e) {
      // Redis unavailable - run as leader (single instance mode)
      this.isLeader = true;
      this.hasRedis = false;
      this.logger.warn('Redis unavailable, running scheduler in single-instance mode');
    }
  }

  private scheduleLockRefresh() {
    // Refresh lock every 20 seconds (half of TTL)
    setInterval(async () => {
      if (this.isLeader) {
        const acquired = await this.redis.acquireLock(this.lockKey, this.lockTtl);
        if (!acquired) {
          this.isLeader = false;
          this.logger.warn('Lost scheduler leadership, will re-attempt');
          setTimeout(() => this.tryAcquireLeadership(), 5000);
        }
      }
    }, 20000);
  }

  // Run every 10 seconds to check for monitors that need to be checked
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleMonitorChecks() {
    if (!this.isLeader) {
      return; // Not the leader, skip
    }

    try {
      // Get all active monitors
      const monitors = await this.getActiveMonitors();
      const now = new Date();

      for (const monitor of monitors) {
        // Check if monitor is due based on its interval
        const lastRun = monitor.lastRunAt ? new Date(monitor.lastRunAt) : null;
        const intervalMs = (monitor.intervalSeconds || 60) * 1000;

        if (lastRun && (now.getTime() - lastRun.getTime()) < intervalMs) {
          continue; // Not yet due
        }

        // If we have Redis, check if already running
        if (this.hasRedis) {
          const runningKey = `monitor:${monitor.id}:running`;
          const isRunning = await this.redis.exists(runningKey);

          if (isRunning) {
            continue; // Skip, already running
          }

          // Mark as running with 2 minute TTL
          await this.redis.set(runningKey, '1', 120000);
        }

        // Execute check
        this.executeMonitorCheck(monitor).finally(async () => {
          // If we have Redis, clear running flag
          if (this.hasRedis) {
            const runningKey = `monitor:${monitor.id}:running`;
            await this.redis.del(runningKey);
          }
        });
      }
    } catch (error: any) {
      this.logger.error(`Error in monitor check scheduler: ${error.message}`);
    }
  }

  private async getActiveMonitors() {
    return this.prisma.monitor.findMany({
      where: {
        active: true,
        maintenanceMode: false,
      },
      include: {
        httpConfig: true,
        wsConfig: true,
        scanConfig: true,
        service: true,
      },
    });
  }

  private async executeMonitorCheck(monitor: any) {
    this.logger.log(`Executing check for monitor ${monitor.id} (${monitor.name})`);

    try {
      switch (monitor.type) {
        case 'http':
          await this.checkExecutor.executeHttpCheck(monitor);
          break;
        case 'websocket':
          await this.checkExecutor.executeWebSocketCheck(monitor);
          break;
        case 'websocket_scan':
          // Scan monitors run on demand, not on schedule
          this.logger.debug(`Skipping scheduled scan for monitor ${monitor.id}`);
          break;
      }
    } catch (error: any) {
      this.logger.error(`Check failed for monitor ${monitor.id}: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupOldCheckRuns() {
    if (!this.isLeader) return;

    try {
      const retentionDays = parseInt(this.config.get('CHECK_RETENTION_DAYS') || '30');
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      const result = await this.prisma.checkRun.deleteMany({
        where: { startedAt: { lt: cutoff } },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up ${result.count} old check runs`);
      }
    } catch (error: any) {
      this.logger.error(`Error cleaning up old check runs: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncStatusPageComponents() {
    if (!this.isLeader) return;

    try {
      const pages = await this.prisma.statusPage.findMany({
        where: { published: true },
        include: { components: true },
      });

      for (const page of pages) {
        for (const component of page.components) {
          let status = 'up';

          if (component.monitorId) {
            const monitor = await this.prisma.monitor.findUnique({
              where: { id: component.monitorId },
            });
            if (monitor) {
              status = monitor.lastStatus || 'up';
            }
          } else if (component.serviceId) {
            const service = await this.prisma.service.findUnique({
              where: { id: component.serviceId },
              include: { monitors: true },
            });
            if (service) {
              const failingMonitors = service.monitors.filter(m => m.lastStatus === 'down').length;
              if (failingMonitors > 0) status = 'degraded';
            }
          }

          await this.prisma.statusPageComponent.update({
            where: { id: component.id },
            data: { status },
          });
        }
      }
    } catch (error: any) {
      this.logger.error(`Error syncing status page components: ${error.message}`);
    }
  }
}