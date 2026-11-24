import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { IdentityKind } from './models';
import { loadConfig } from '../../config';
import { RedisStore } from './redis.store';
import { randomToken } from './security';

export type SessionStage = 'authenticated' | 'totp_pending' | 'enrollment_pending';
export interface StoredSession {
  userId: string;
  kind: IdentityKind;
  stage: SessionStage;
  csrfToken: string;
  createdAt: string;
}

export interface SessionContext {
  id: string;
  cookieName: string;
  value: StoredSession;
}

function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const item of header.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return undefined;
}

function appendCookie(response: Response, value: string): void {
  const previous = response.getHeader('Set-Cookie');
  const cookies = previous
    ? Array.isArray(previous)
      ? previous.map(String)
      : [String(previous)]
    : [];
  response.setHeader('Set-Cookie', [...cookies, value]);
}

@Injectable()
export class SessionService {
  private readonly secret = loadConfig().SESSION_SECRET;
  private readonly secureCookies = process.env.NODE_ENV === 'production';
  private readonly secureSuffix = this.secureCookies ? '; Secure' : '';

  constructor(@Inject(RedisStore) private readonly redis: RedisStore) {}

  async issueCsrf(response: Response): Promise<{ csrfToken: string }> {
    const csrfToken = randomToken();
    await this.redis.put(
      `auth:csrf:${createHash('sha256').update(csrfToken).digest('hex')}`,
      true,
      600,
    );
    appendCookie(response, this.csrfCookie(csrfToken, 600));
    return { csrfToken };
  }

  async assertCsrf(request: Request, session?: SessionContext): Promise<void> {
    const header = request.header('x-csrf-token');
    const cookie = cookieValue(request, 'csrf_token');
    if (!header || !cookie || !this.equal(header, cookie))
      throw new UnauthorizedException('CSRF validation failed.');
    if (session) {
      if (!this.equal(header, session.value.csrfToken))
        throw new UnauthorizedException('CSRF validation failed.');
      return;
    }
    const key = `auth:csrf:${createHash('sha256').update(header).digest('hex')}`;
    if (!(await this.redis.consume(key)))
      throw new UnauthorizedException('CSRF validation failed.');
  }

  async createSession(
    response: Response,
    userId: string,
    kind: IdentityKind,
    stage: SessionStage,
    ttlSeconds: number,
  ): Promise<{ sessionId: string; csrfToken: string }> {
    const sessionId = randomBytes(32).toString('base64url');
    const csrfToken = randomToken();
    const session: StoredSession = {
      userId,
      kind,
      stage,
      csrfToken,
      createdAt: new Date().toISOString(),
    };
    await this.redis.put(`auth:session:${sessionId}`, session, ttlSeconds);
    await this.redis.addToSet(`auth:user-sessions:${userId}`, sessionId, ttlSeconds);
    const cookieName = stage === 'authenticated' ? `${kind}_session` : `${kind}_pre_auth`;
    appendCookie(
      response,
      this.sessionCookie(cookieName, this.signedSessionId(sessionId), ttlSeconds),
    );
    appendCookie(response, this.csrfCookie(csrfToken, ttlSeconds));
    return { sessionId, csrfToken };
  }

  async getRequestSession(request: Request): Promise<SessionContext | null> {
    const candidates = ['admin_session', 'partner_session', 'admin_pre_auth', 'partner_pre_auth'];
    for (const cookieName of candidates) {
      const signedId = cookieValue(request, cookieName);
      const id = signedId ? this.verifySessionId(signedId) : undefined;
      if (!id) continue;
      const value = await this.redis.get<StoredSession>(`auth:session:${id}`);
      if (value) return { id, cookieName, value };
    }
    return null;
  }

  async removeSession(response: Response, session: SessionContext): Promise<void> {
    await this.redis.remove(`auth:session:${session.id}`);
    await this.redis.removeFromSet(`auth:user-sessions:${session.value.userId}`, session.id);
    appendCookie(response, this.sessionCookie(session.cookieName, '', 0));
    appendCookie(response, this.csrfCookie('', 0));
  }

  async discardPreAuth(response: Response, session: SessionContext): Promise<void> {
    await this.redis.remove(`auth:session:${session.id}`);
    await this.redis.removeFromSet(`auth:user-sessions:${session.value.userId}`, session.id);
    appendCookie(response, this.sessionCookie(session.cookieName, '', 0));
  }

  async revokeUserSessions(userId: string): Promise<void> {
    const key = `auth:user-sessions:${userId}`;
    const sessionIds = await this.redis.members(key);
    await Promise.all(sessionIds.map((id) => this.redis.remove(`auth:session:${id}`)));
    await this.redis.remove(key);
  }

  sessionTtl(kind: IdentityKind): number {
    return kind === 'admin'
      ? Number(process.env.ADMIN_SESSION_TTL_SECONDS ?? 14_400)
      : Number(process.env.PARTNER_SESSION_TTL_SECONDS ?? 43_200);
  }

  private sessionCookie(name: string, value: string, ttlSeconds: number): string {
    return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ttlSeconds}${this.secureSuffix}`;
  }

  private csrfCookie(value: string, ttlSeconds: number): string {
    return `csrf_token=${encodeURIComponent(value)}; Path=/; SameSite=Strict; Max-Age=${ttlSeconds}${this.secureSuffix}`;
  }

  private equal(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private signedSessionId(id: string): string {
    const signature = createHmac('sha256', this.secret).update(id).digest('base64url');
    return `${id}.${signature}`;
  }

  private verifySessionId(value: string): string | undefined {
    const separator = value.lastIndexOf('.');
    if (separator < 1) return undefined;
    const id = value.slice(0, separator);
    const signature = value.slice(separator + 1);
    const expected = createHmac('sha256', this.secret).update(id).digest('base64url');
    return this.equal(signature, expected) ? id : undefined;
  }
}
