import { createHash, randomBytes } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import type { Request } from 'express';

const COOKIE = 'openfaq_session';

@Injectable()
export class AuthService {
  private readonly sessions = new Map<string, number>();
  constructor(private readonly config: ConfigService) {}

  async login(email: string, password: string): Promise<string | null> {
    const expectedEmail = this.config.get<string>('ADMIN_EMAIL', 'admin@openfaq.local');
    if (email.toLowerCase() !== expectedEmail.toLowerCase()) return null;
    const hash = this.config.get<string>('ADMIN_PASSWORD_HASH', '');
    const developmentPassword = this.config.get<string>('ADMIN_PASSWORD', 'change-me');
    const valid = hash
      ? await argon2.verify(hash, password).catch(() => false)
      : this.config.get('NODE_ENV') !== 'production' && password === developmentPassword;
    if (!valid) return null;
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(this.digest(token), Date.now() + 12 * 60 * 60 * 1000);
    return token;
  }

  logout(token?: string): void {
    if (token) this.sessions.delete(this.digest(token));
  }

  valid(token?: string): boolean {
    if (!token) return false;
    const key = this.digest(token);
    const expires = this.sessions.get(key) ?? 0;
    if (expires <= Date.now()) {
      this.sessions.delete(key);
      return false;
    }
    return true;
  }

  cookieName(): string {
    return COOKIE;
  }
  private digest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!this.auth.valid(request.cookies?.[this.auth.cookieName()]))
      throw new UnauthorizedException();
    return true;
  }
}
