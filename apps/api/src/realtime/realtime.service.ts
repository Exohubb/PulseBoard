import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RealtimeService {
  constructor(private redis: RedisService) {}

  async publish(workspaceId: string, event: string, data: any) {
    const channel = `workspace:${workspaceId}`;
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    await this.redis.publish(channel, message);
  }

  async publishToUser(userId: string, event: string, data: any) {
    const channel = `user:${userId}`;
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    await this.redis.publish(channel, message);
  }

  async publishMonitorUpdate(workspaceId: string, monitorId: string, status: string) {
    await this.publish(workspaceId, 'monitor.updated', { monitorId, status });
  }

  async publishCheckCompleted(workspaceId: string, checkRunId: string, success: boolean) {
    await this.publish(workspaceId, 'check.completed', { checkRunId, success });
  }

  async publishIncidentUpdate(workspaceId: string, incidentId: string, status: string) {
    await this.publish(workspaceId, 'incident.updated', { incidentId, status });
  }

  async publishServiceStatus(workspaceId: string, serviceId: string, status: string) {
    await this.publish(workspaceId, 'service.status.changed', { serviceId, status });
  }

  async publishAlertSent(workspaceId: string, alertDeliveryId: string, status: string) {
    await this.publish(workspaceId, 'alert.sent', { alertDeliveryId, status });
  }

  async publishScannerCompleted(workspaceId: string, scanRunId: string, score: number) {
    await this.publish(workspaceId, 'scanner.completed', { scanRunId, score });
  }
}