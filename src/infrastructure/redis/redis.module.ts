import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisThrottlerStorage } from './redis-throttler.storage';

@Module({
  providers: [RedisService, RedisThrottlerStorage],
  exports: [RedisService, RedisThrottlerStorage],
})
export class RedisModule {}
