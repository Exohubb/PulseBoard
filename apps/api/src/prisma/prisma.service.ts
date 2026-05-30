import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }

    const models = [
      'CheckAssertion',
      'CheckRun',
      'ScannerFinding',
      'ScannerRun',
      'IncidentUpdate',
      'IncidentServiceLink',
      'AlertDelivery',
      'MaintenanceWindow',
      'StatusPageComponent',
      'StatusPage',
      'AlertPolicy',
      'AlertChannel',
      'Incident',
      'Monitor',
      'MonitorHttpConfig',
      'MonitorWsConfig',
      'MonitorScanConfig',
      'Service',
      'WorkspaceMember',
      'AuditLog',
      'Workspace',
      'RefreshToken',
      'User',
    ];

    for (const model of models) {
      try {
        await (this as any)[model.charAt(0).toLowerCase() + model.slice(1)].deleteMany({});
      } catch (e) {
        // Ignore errors for models that might not exist yet
      }
    }
  }
}