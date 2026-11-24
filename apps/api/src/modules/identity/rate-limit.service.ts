import { HttpException, Inject, Injectable } from '@nestjs/common';
import { loadConfig } from '../../config';
import { digestToken } from './security';
import { RedisStore } from './redis.store';

interface RateLimit {
  namespace: string;
  subject: string;
  maximum: number;
  windowSeconds: number;
}

@Injectable()
export class RateLimitService {
  constructor(@Inject(RedisStore) private readonly redis: RedisStore) {}

  async enforce(limits: RateLimit[]): Promise<void> {
    const results = await Promise.all(
      limits.map(async (limit) => {
        const subjectHash = digestToken(limit.subject);
        const { count, ttl } = await this.redis.incrementWindow(
          `rate:${limit.namespace}:${subjectHash}`,
          limit.windowSeconds,
        );
        return { exceeded: count > limit.maximum, retryAfter: Math.max(ttl, 1) };
      }),
    );
    const blocked = results.find((result) => result.exceeded);
    if (blocked) {
      throw new HttpException(
        {
          message: 'Too many attempts. Try again later.',
          retryAfterSeconds: blocked.retryAfter,
        },
        429,
      );
    }
  }

  loginLimits(kind: string, email: string, ip: string) {
    const config = loadConfig();
    return [
      {
        namespace: 'login:ip',
        subject: ip,
        maximum: config.LOGIN_RATE_LIMIT_IP_MAX_REQUESTS,
        windowSeconds: config.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
      },
      {
        namespace: 'login:account',
        subject: `${kind}:${email.trim().toLowerCase()}`,
        maximum: config.LOGIN_RATE_LIMIT_ACCOUNT_MAX_REQUESTS,
        windowSeconds: config.LOGIN_RATE_LIMIT_WINDOW_SECONDS,
      },
    ];
  }

  passwordResetLimits(email: string, ip: string) {
    const config = loadConfig();
    return [
      {
        namespace: 'password-reset:ip',
        subject: ip,
        maximum: config.PASSWORD_RESET_RATE_LIMIT_IP_MAX_REQUESTS,
        windowSeconds: config.PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS,
      },
      {
        namespace: 'password-reset:account',
        subject: email.trim().toLowerCase(),
        maximum: config.PASSWORD_RESET_RATE_LIMIT_ACCOUNT_MAX_REQUESTS,
        windowSeconds: config.PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS,
      },
    ];
  }
}
