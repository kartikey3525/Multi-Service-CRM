import { Injectable, Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class StructuredLoggerMiddleware {
  private readonly logger = new Logger('http');

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    response.once('finish', () => {
      const record = {
        level: 'info',
        message: 'http_request',
        requestId: response.locals.requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      };
      this.logger.log(JSON.stringify(record));
    });
    next();
  }
}
