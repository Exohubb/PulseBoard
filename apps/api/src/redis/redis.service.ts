import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly pubClient: Redis;
  private readonly subClient: Redis;
  private isConnected = false;

  constructor(@Inject('REDIS_CLIENT') private readonly client: Redis) {
    this.pubClient = client.duplicate();
    this.subClient = client.duplicate();

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', () => {
      this.isConnected = false;
    });

    this.logger.log('Redis service initialized');
  }

  async onModuleDestroy() {
    try {
      if (this.isConnected) {
        await this.pubClient.quit();
        await this.subClient.quit();
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  private async safeOp<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.isConnected) return fallback;
    try {
      return await op();
    } catch (e) {
      this.logger.warn(`Redis operation failed: ${e.message}`);
      return fallback;
    }
  }

  async get(key: string): Promise<string | null> {
    return this.safeOp(() => this.client.get(key), null);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    return this.safeOp(async () => {
      if (ttlMs) {
        await this.client.set(key, value, 'PX', ttlMs);
      } else {
        await this.client.set(key, value);
      }
    }, undefined);
  }

  async del(key: string): Promise<void> {
    return this.safeOp(() => this.client.del(key) as unknown as Promise<void>, undefined);
  }

  async exists(key: string): Promise<boolean> {
    return this.safeOp(async () => (await this.client.exists(key)) === 1, false);
  }

  async incr(key: string): Promise<number> {
    return this.safeOp(() => this.client.incr(key), 0);
  }

  async expire(key: string, seconds: number): Promise<void> {
    return this.safeOp(() => this.client.expire(key, seconds) as unknown as Promise<void>, undefined);
  }

  async acquireLock(key: string, ttlMs: number): Promise<boolean> {
    return this.safeOp(async () => {
      const result = await this.client.set(key, '1', 'PX', ttlMs, 'NX');
      return result === 'OK';
    }, false);
  }

  async releaseLock(key: string): Promise<void> {
    return this.safeOp(() => this.client.del(key) as unknown as Promise<void>, undefined);
  }

  async publish(channel: string, message: string): Promise<void> {
    return this.safeOp(() => this.pubClient.publish(channel, message) as unknown as Promise<void>, undefined);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.subClient.subscribe(channel);
      this.subClient.on('message', (ch, msg) => {
        if (ch === channel) {
          callback(msg);
        }
      });
    } catch (e) {
      this.logger.warn(`Redis subscribe failed: ${e.message}`);
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    return this.safeOp(() => this.client.hset(key, field, value) as unknown as Promise<void>, undefined);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.safeOp(() => this.client.hget(key, field), null);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.safeOp(() => this.client.hgetall(key), {});
  }

  async hmset(key: string, data: Record<string, string>): Promise<void> {
    return this.safeOp(() => this.client.hmset(key, data) as unknown as Promise<void>, undefined);
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.safeOp(() => this.client.hincrby(key, field, increment), 0);
  }
}