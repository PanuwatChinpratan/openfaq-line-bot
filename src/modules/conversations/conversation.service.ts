import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { RedisService } from '../../infrastructure/redis/redis.service';

export type ConversationSession = {
  status: 'active' | 'handoff';
  expiresAt: number;
  messages: string[];
};

const conversationSessionSchema = z.object({
  status: z.enum(['active', 'handoff']),
  expiresAt: z.number().int().positive(),
  messages: z.array(z.string()).max(20),
});

@Injectable()
export class ConversationService {
  private readonly sessions = new Map<string, ConversationSession>();

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  key(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }

  async add(userId: string, sanitized: string): Promise<ConversationSession> {
    const key = this.key(userId);
    const now = Date.now();
    const max = this.config.get<number>('MAX_CONVERSATION_MESSAGES', 6);
    const ttl = this.config.get<number>('CONVERSATION_TTL_MINUTES', 30) * 60_000;
    const current = await this.read(key);
    const session =
      !current || current.expiresAt <= now
        ? { status: 'active' as const, expiresAt: now + ttl, messages: [] }
        : current;
    session.messages = [...session.messages, sanitized].slice(-max);
    session.expiresAt = now + ttl;
    await this.write(key, session, Math.ceil(ttl / 1000));
    return session;
  }

  async handoff(userId: string): Promise<void> {
    const session = await this.add(userId, 'handoff');
    session.status = 'handoff';
    const ttlSeconds = this.config.get<number>('CONVERSATION_TTL_MINUTES', 30) * 60;
    await this.write(this.key(userId), session, ttlSeconds);
  }

  async get(userId: string): Promise<ConversationSession | undefined> {
    const session = await this.read(this.key(userId));
    if (session && session.expiresAt > Date.now()) return session;
    return undefined;
  }

  private async read(key: string): Promise<ConversationSession | undefined> {
    const client = this.redis.connection;
    if (client) {
      try {
        const value = await client.get(`openfaq:conversation:${key}`);
        if (value) return conversationSessionSchema.parse(JSON.parse(value));
      } catch {
        // Conversation state is non-critical; continue with the local fallback.
      }
    }
    return this.sessions.get(key);
  }

  private async write(
    key: string,
    session: ConversationSession,
    ttlSeconds: number,
  ): Promise<void> {
    this.sessions.set(key, session);
    const client = this.redis.connection;
    if (!client) return;
    try {
      await client.set(`openfaq:conversation:${key}`, JSON.stringify(session), { EX: ttlSeconds });
    } catch {
      // Keep serving the current process when optional Redis is temporarily unavailable.
    }
  }
}
