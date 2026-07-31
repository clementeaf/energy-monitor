import { Module } from '@nestjs/common';
import { BaselineService } from './baseline.service';
import { BaselineController } from './baseline.controller';

@Module({
  controllers: [BaselineController],
  providers: [BaselineService],
  exports: [BaselineService],
})
export class BaselineModule {}
