import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      workspace: {
        create: jest.fn(),
      },
      workspaceMember: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('mock-token'),
      verify: jest.fn().mockReturnValue({ sub: 'user-id', email: 'test@test.com' }),
    };

    const mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email exists', async () => {
      prismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'password123',
          name: 'Test User',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should create user and workspace on successful registration', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        name: 'New User',
      });
      prismaService.workspace.create.mockResolvedValue({ id: 'workspace' });
      prismaService.workspaceMember.create.mockResolvedValue({});
      prismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'new@test.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('new@test.com');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@test.com',
          password: 'password',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const hashedPassword = await bcrypt.hash('correct-password', 12);
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'test@test.com',
        passwordHash: hashedPassword,
      });

      await expect(
        service.login({
          email: 'test@test.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });
});