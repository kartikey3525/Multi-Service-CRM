import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import mongoose from 'mongoose';
import { Public } from './modules/identity/identity.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  getHealth(): { status: 'ok' } {
    if (mongoose.connection.readyState !== 1) {
      throw new ServiceUnavailableException('Service is not ready.');
    }
    return { status: 'ok' };
  }
}
