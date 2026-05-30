import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AlertsService', () => {
  let service: AlertsService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrisma = {
      alertChannel: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      alertPolicy: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      alertDelivery: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      incident: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createChannel', () => {
    it('should create a new alert channel', async () => {
      const mockChannel = {
        id: 'channel-1',
        workspaceId: 'workspace-1',
        type: 'slack',
        name: 'Engineering Team',
        enabled: true,
      };

      prismaService.alertChannel.create.mockResolvedValue(mockChannel);

      const result = await service.createChannel('workspace-1', {
        type: 'slack',
        name: 'Engineering Team',
        config: { webhookUrl: 'https://hooks.slack.com/test' },
      });

      expect(result).toHaveProperty('id', 'channel-1');
      expect(result).toHaveProperty('name', 'Engineering Team');
    });
  });

  describe('createPolicy', () => {
    it('should create a new alert policy', async () => {
      const mockPolicy = {
        id: 'policy-1',
        workspaceId: 'workspace-1',
        name: 'Critical Alerts',
        event: 'incident_created',
        severity: 'critical',
        enabled: true,
      };

      prismaService.alertPolicy.create.mockResolvedValue(mockPolicy);

      const result = await service.createPolicy('workspace-1', {
        name: 'Critical Alerts',
        event: 'incident_created',
        severity: 'critical',
        alertChannelIds: ['channel-1'],
      });

      expect(result).toHaveProperty('id', 'policy-1');
      expect(result).toHaveProperty('event', 'incident_created');
    });
  });

  describe('sendAlert', () => {
    it('should return null if policy is disabled', async () => {
      prismaService.alertPolicy.findUnique.mockResolvedValue({
        id: 'policy-1',
        enabled: false,
        cooldownMinutes: 5,
      });

      const result = await service.sendAlert('policy-1', 'channel-1', 'incident-1', {
        title: 'Test Alert',
        message: 'Test message',
      });

      expect(result).toBeNull();
    });

    it('should return null if channel is disabled', async () => {
      prismaService.alertPolicy.findUnique.mockResolvedValue({
        id: 'policy-1',
        enabled: true,
        cooldownMinutes: 5,
      });
      prismaService.alertChannel.findUnique.mockResolvedValue({
        id: 'channel-1',
        enabled: false,
      });

      const result = await service.sendAlert('policy-1', 'channel-1', 'incident-1', {
        title: 'Test Alert',
        message: 'Test message',
      });

      expect(result).toBeNull();
    });
  });
});