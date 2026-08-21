import { ConfigService } from '@nestjs/config';
import type { RedisService } from '../src/infrastructure/redis/redis.service';
import { RedisThrottlerStorage } from '../src/infrastructure/redis/redis-throttler.storage';
import { ConversationService } from '../src/modules/conversations/conversation.service';

function config() {
  return new ConfigService({ CONVERSATION_TTL_MINUTES: 30, MAX_CONVERSATION_MESSAGES: 2 });
}

describe('optional Redis runtime', () => {
  test('keeps conversation state in memory when Redis is disabled', async () => {
    const service = new ConversationService(config(), { connection: undefined } as RedisService);
    await service.add('line-user-1', 'first');
    await service.add('line-user-1', 'second');
    await service.add('line-user-1', 'third');

    expect((await service.get('line-user-1'))?.messages).toEqual(['second', 'third']);
  });

  test('shares hashed, expiring conversation state through Redis', async () => {
    const values = new Map<string, string>();
    const connection = {
      get: jest.fn(async (key: string) => values.get(key) ?? null),
      set: jest.fn(async (key: string, value: string, _options: { EX: number }) => {
        values.set(key, value);
        return 'OK';
      }),
    };
    const redis = { connection } as unknown as RedisService;
    const first = new ConversationService(config(), redis);
    const second = new ConversationService(config(), redis);

    await first.add('line-user-2', 'hello');
    await first.handoff('line-user-2');

    expect((await second.get('line-user-2'))?.status).toBe('handoff');
    const [storedKey, , options] = connection.set.mock.calls.at(-1) ?? [];
    expect(storedKey).not.toContain('line-user-2');
    expect(options).toEqual({ EX: 1800 });
  });

  test('maps the atomic Redis throttle result to the Nest storage contract', async () => {
    const connection = { eval: jest.fn(async () => [121, 60, 1, 60]) };
    const storage = new RedisThrottlerStorage({ connection } as unknown as RedisService);

    await expect(storage.increment('request-key', 60_000, 120, 60_000, 'default')).resolves.toEqual(
      {
        totalHits: 121,
        timeToExpire: 60,
        isBlocked: true,
        timeToBlockExpire: 60,
      },
    );
    expect(connection.eval).toHaveBeenCalledTimes(1);
  });
});
