import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { type ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import { RedisService } from './redis.service';

const INCREMENT_SCRIPT = `
local now = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local blockDuration = tonumber(ARGV[4])
local values = redis.call('HMGET', KEYS[1], 'hits', 'blockedUntil')
local hits = tonumber(values[1]) or 0
local blockedUntil = tonumber(values[2]) or 0
local remaining = redis.call('PTTL', KEYS[1])

if blockedUntil > now then
  return { hits, math.max(1, math.ceil(remaining / 1000)), 1, math.ceil((blockedUntil - now) / 1000) }
end

if remaining <= 0 then
  hits = 0
  blockedUntil = 0
  remaining = ttl
end

hits = hits + 1
local isBlocked = 0
local blockRemaining = 0
if hits > limit then
  isBlocked = 1
  blockedUntil = now + blockDuration
  blockRemaining = math.ceil(blockDuration / 1000)
  remaining = math.max(remaining, blockDuration)
end

redis.call('HSET', KEYS[1], 'hits', hits, 'blockedUntil', blockedUntil)
redis.call('PEXPIRE', KEYS[1], remaining)
return { hits, math.max(1, math.ceil(remaining / 1000)), isBlocked, blockRemaining }
`;

type ThrottleRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
  private readonly fallback = new ThrottlerStorageService();

  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottleRecord> {
    const client = this.redis.connection;
    if (!client) return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    try {
      const storageKey = `openfaq:throttle:${throttlerName}:${key}`;
      const result = (await client.eval(INCREMENT_SCRIPT, {
        keys: [storageKey],
        arguments: [String(Date.now()), String(ttl), String(limit), String(blockDuration)],
      })) as number[];
      return {
        totalHits: result[0] ?? 0,
        timeToExpire: result[1] ?? Math.ceil(ttl / 1000),
        isBlocked: result[2] === 1,
        timeToBlockExpire: result[3] ?? 0,
      };
    } catch {
      return this.fallback.increment(key, ttl, limit, blockDuration, throttlerName);
    }
  }

  onApplicationShutdown(): void {
    this.fallback.onApplicationShutdown();
  }
}
