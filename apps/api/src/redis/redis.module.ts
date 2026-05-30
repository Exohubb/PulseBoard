import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

const logger = new Logger('RedisModule');

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get('REDIS_URL') || 'redis://localhost:6379';
        const redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => {
            if (times > 1) {
              logger.warn(`Redis connection failed, continuing without Redis`);
              return null; // Stop retrying
            }
            return 100;
          },
          lazyConnect: true,
        });

        redis.on('error', (err) => {
          logger.warn(`Redis error: ${err.message}`);
        });

        redis.connect().catch((err) => {
          logger.warn(`Redis connection failed: ${err.message}`);
        });

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}