import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type Session = { status: 'active' | 'handoff'; expiresAt: number; messages: string[] };
@Injectable()
export class ConversationService {
  private readonly sessions = new Map<string, Session>();
  constructor(private readonly config: ConfigService) {}
  key(userId: string): string {
    return createHash('sha256').update(userId).digest('hex');
  }
  add(userId: string, sanitized: string): Session {
    const key = this.key(userId);
    const now = Date.now();
    const max = this.config.get<number>('MAX_CONVERSATION_MESSAGES', 6);
    const ttl = this.config.get<number>('CONVERSATION_TTL_MINUTES', 30) * 60_000;
    const current = this.sessions.get(key);
    const session =
      !current || current.expiresAt <= now
        ? { status: 'active' as const, expiresAt: now + ttl, messages: [] }
        : current;
    session.messages = [...session.messages, sanitized].slice(-max);
    session.expiresAt = now + ttl;
    this.sessions.set(key, session);
    return session;
  }
  handoff(userId: string): void {
    const session = this.add(userId, 'handoff');
    session.status = 'handoff';
  }
  get(userId: string): Session | undefined {
    const session = this.sessions.get(this.key(userId));
    if (session && session.expiresAt > Date.now()) return session;
    return undefined;
  }
}
