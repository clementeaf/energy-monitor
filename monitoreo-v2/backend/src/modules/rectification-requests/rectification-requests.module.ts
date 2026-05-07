import { Module } from '@nestjs/common';
import { RectificationRequestsController } from './rectification-requests.controller';
import { RectificationRequestsService } from './rectification-requests.service';

@Module({
  controllers: [RectificationRequestsController],
  providers: [RectificationRequestsService],
})
export class RectificationRequestsModule {}
