import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditModel } from './models';

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (/password|secret|token|cookie|recovery|authorization/i.test(key))
      result[key] = '[REDACTED]';
    else result[key] = redact(entry);
  }
  return result;
}

@Injectable()
export class AuditService {
  async record(
    request: Request,
    entry: { action: string; entity: string; entityId?: string; before?: unknown; after?: unknown },
  ): Promise<void> {
    const actor = (request as Request & { actor?: { userId: string } }).actor;
    const ip = request.ip;
    const userAgent = request.header('user-agent')?.slice(0, 512);
    await AuditModel.create({
      ...(actor ? { actorUserId: new Types.ObjectId(actor.userId) } : {}),
      action: entry.action,
      entity: entry.entity,
      ...(entry.entityId ? { entityId: entry.entityId } : {}),
      ...(entry.before !== undefined
        ? { before: redact(entry.before) as Record<string, unknown> | null }
        : {}),
      ...(entry.after !== undefined
        ? { after: redact(entry.after) as Record<string, unknown> | null }
        : {}),
      ...(ip ? { ip } : {}),
      ...(userAgent ? { userAgent } : {}),
      createdAt: new Date(),
    });
  }
}
