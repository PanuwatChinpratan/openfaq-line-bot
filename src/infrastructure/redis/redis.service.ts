import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

function createOpenFaqRedisClient(url: string) {
  return createClient({
    url,
    socket: {
      connectTimeout: 2_000,
      reconnectStrategy: (retries) => (retries >= 2 ? false : Math.min(100 * 2 ** retries, 1_000)),
    },
  });
}

export type OpenFaqRedisClient = ReturnType<typeof createOpenFaqRedisClient>;

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client?: OpenFaqRedisClient;

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get<string>('REDIS_URL', '').trim());
  }

  get ready(): boolean {
    return this.client?.isReady === true;
  }

  get connection(): OpenFaqRedisClient | undefined {
    return this.ready ? this.client : undefined;
  }

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL', '').trim();
    if (!url) return;

    const client = createOpenFaqRedisClient(url);
    client.on('error', () => {
      if (client.isReady) this.logger.warn('Redis connection interrupted');
    });
    try {
      await client.connect();
      this.client = client;
      this.logger.log('Redis runtime enabled');
    } catch {
      client.destroy();
      this.logger.warn('Redis unavailable; using process-local fallbacks');
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.client?.isOpen) return;
    await this.client.close().catch(() => this.client?.destroy());
  }
}
