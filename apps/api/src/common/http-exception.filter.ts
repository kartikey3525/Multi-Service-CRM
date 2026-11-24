import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = response.locals.requestId as string | undefined;
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const code = status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`;
    const message =
      status >= 500
        ? 'An unexpected error occurred.'
        : exception instanceof HttpException
          ? this.publicMessage(exception)
          : 'Request failed.';

    if (status >= 500) {
      this.logger.error(JSON.stringify({ level: 'error', code, requestId, path: request.path }));
    }
    response.status(status).json({ code, message, requestId });
  }

  private publicMessage(exception: HttpException): string {
    const payload: unknown = exception.getResponse();
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return 'Request validation failed.';
    }
    return exception.message;
  }
}
