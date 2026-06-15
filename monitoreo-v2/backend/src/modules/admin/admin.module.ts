import { Module } from '@nestjs/common';
import { ApiObservabilityController } from './api-observability.controller';

@Module({
  controllers: [ApiObservabilityController],
})
export class AdminModule {}
