import { Test, TestingModule } from '@nestjs/testing';
import { IncidentsService } from './incidents.service';
import { PrismaService } from '../prisma/prisma.service';

describe('IncidentsService', () => {
  let service: IncidentsService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrisma = {
      incident: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      incidentUpdate: {
        create: jest.fn(),
      },
      incidentServiceLink: {
        create: jest.fn(),
      },
      monitor: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IncidentsService>(IncidentsService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an incident with service links', async () => {
      const mockIncident = {
        id: 'incident-1',
        title: 'Test Incident',
        slug: 'test-incident-123',
        severity: 'high',
        status: 'open',
        workspaceId: 'workspace-1',
      };

      prismaService.incident.create.mockResolvedValue(mockIncident);
      prismaService.incidentUpdate.create.mockResolvedValue({});

      const result = await service.create('workspace-1', 'user-1', {
        title: 'Test Incident',
        severity: 'high',
        serviceIds: ['service-1'],
      });

      expect(result).toHaveProperty('id', 'incident-1');
      expect(result).toHaveProperty('title', 'Test Incident');
      expect(prismaService.incident.create).toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('should return incidents filtered by status', async () => {
      const mockIncidents = [
        { id: '1', title: 'Incident 1', status: 'open' },
        { id: '2', title: 'Incident 2', status: 'investigating' },
      ];

      prismaService.incident.findMany.mockResolvedValue(mockIncidents);

      const result = await service.list('workspace-1', {
        status: ['open', 'investigating'],
      });

      expect(result).toHaveLength(2);
      expect(prismaService.incident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceId: 'workspace-1',
            status: { in: ['open', 'investigating'] },
          }),
        })
      );
    });
  });

  describe('update', () => {
    it('should update incident and create status change update', async () => {
      const mockIncident = {
        id: 'incident-1',
        title: 'Test Incident',
        status: 'open',
      };

      prismaService.incident.findFirst.mockResolvedValue(mockIncident);
      prismaService.incident.update.mockResolvedValue({
        ...mockIncident,
        status: 'investigating',
      });
      prismaService.incidentUpdate.create.mockResolvedValue({});

      const result = await service.update('workspace-1', 'incident-1', 'user-1', {
        status: 'investigating',
      });

      expect(result.status).toBe('investigating');
      expect(prismaService.incidentUpdate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'status_changed',
          }),
        })
      );
    });
  });

  describe('autoCreateIncident', () => {
    it('should return null if monitor not found', async () => {
      prismaService.monitor.findFirst.mockResolvedValue(null);

      const result = await service.autoCreateIncident('workspace-1', 'nonexistent', 'check-1', 'Connection refused');

      expect(result).toBeNull();
    });

    it('should create incident for failing monitor', async () => {
      const mockMonitor = {
        id: 'monitor-1',
        name: 'Test Monitor',
        workspaceId: 'workspace-1',
        consecutiveFailures: 5,
        service: { id: 'service-1', name: 'Test Service' },
      };

      prismaService.monitor.findFirst.mockResolvedValue(mockMonitor);
      prismaService.incident.create.mockResolvedValue({
        id: 'incident-1',
        title: 'Incident: Test Monitor is down',
      });
      prismaService.incidentUpdate.create.mockResolvedValue({});
      prismaService.incidentServiceLink.create.mockResolvedValue({});

      const result = await service.autoCreateIncident('workspace-1', 'monitor-1', 'check-1', 'Connection refused');

      expect(result).toHaveProperty('id', 'incident-1');
      expect(result?.title).toContain('Test Monitor');
    });
  });
});