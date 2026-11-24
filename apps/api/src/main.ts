import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import { loadConfig } from './config';
import mongoose from 'mongoose';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  await mongoose.connect(config.MONGODB_URI);
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(requestIdMiddleware);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
  console.log(JSON.stringify({ level: 'info', message: 'api_started', port: config.PORT }));
}

void bootstrap().catch((error: unknown) => {
  const safeMessage = error instanceof Error ? error.name : 'unknown startup error';
  console.error(
    JSON.stringify({ level: 'error', message: 'api_start_failed', error: safeMessage }),
  );
  process.exitCode = 1;
});
