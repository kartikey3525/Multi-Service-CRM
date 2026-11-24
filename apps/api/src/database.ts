import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import mongoose from 'mongoose';

@Injectable()
export class DatabaseLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseLifecycle.name);

  async onApplicationShutdown(): Promise<void> {
    await mongoose.disconnect();
    this.logger.log(JSON.stringify({ level: 'info', message: 'mongodb_disconnected' }));
  }
}
