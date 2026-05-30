import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async create(userId: string, name: string, scopes: 'read' | 'write' = 'read') {
    if (!name || name.trim().length === 0) {
      throw new ForbiddenException('Name is required');
    }
    const raw = randomBytes(24).toString('hex');
    const token = `pb_${raw}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const prefix = token.slice(0, 10);

    const created = await this.prisma.apiKey.create({
      data: {
        userId,
        name: name.trim(),
        prefix,
        tokenHash,
        scopes,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        createdAt: true,
      },
    });

    return { ...created, token };
  }

  async revoke(userId: string, id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.userId !== userId) throw new NotFoundException('Key not found');
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }
}
