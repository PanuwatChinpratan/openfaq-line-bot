import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { RedisModule } from './infrastructure/redis/redis.module';
import { RedisThrottlerStorage } from './infrastructure/redis/redis-throttler.storage';
import { HealthController } from './modules/health/health.controller';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { LineModule } from './modules/line/line.module';
import { AdminGuard, AuthService } from './modules/public-api/auth.service';
import { PublicApiController } from './modules/public-api/public-api.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ ttl: 60_000, limit: 120 }],
        storage,
      }),
    }),
    KnowledgeModule,
    LineModule,
  ],
  controllers: [HealthController, PublicApiController],
  providers: [AuthService, AdminGuard, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
