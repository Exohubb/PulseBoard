import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto/auth.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
      },
    });

    // Create demo workspace for new users
    const workspaceSlug = dto.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-');
    await this.prisma.workspace.create({
      data: {
        name: `${dto.name}'s Workspace`,
        slug: workspaceSlug,
        members: {
          create: {
            userId: user.id,
            role: 'owner',
          },
        },
      },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        meta: JSON.stringify({ email: user.email }),
      },
    });

    return this.generateTokens(user);
  }

  async refreshToken(token: string): Promise<AuthResponseDto> {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    const refreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: hashedToken,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(refreshToken.user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 8) {
      throw new UnauthorizedException('Password must be at least 8 characters');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Revoke all refresh tokens to force re-login on other devices
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: { userId, action: 'password_changed' },
    });
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Password is incorrect');
    // Reassign owned workspaces or delete them - simplest: cascade-delete user → cascades to memberships
    // but workspace itself only cascades if it's the only member. We'll delete workspaces where user is sole owner.
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, role: 'owner' },
      include: { workspace: { include: { members: true } } },
    });
    for (const m of memberships) {
      const otherMembers = m.workspace.members.filter(x => x.userId !== userId);
      if (otherMembers.length === 0) {
        await this.prisma.workspace.delete({ where: { id: m.workspaceId } });
      }
    }
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  private async generateTokens(user: User): Promise<AuthResponseDto> {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(refreshToken);

    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN') || '30d';
    const expiresAt = new Date();
    if (refreshExpiresIn.endsWith('d')) {
      expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn));
    } else if (refreshExpiresIn.endsWith('h')) {
      expiresAt.setHours(expiresAt.getHours() + parseInt(refreshExpiresIn));
    }

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  private hashToken(token: string): string {
    return randomBytes(32).toString('hex');
  }

  verifyAccessToken(token: string): { sub: string; email: string } {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}