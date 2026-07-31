import { Module } from '@nestjs/common';
import { CarbonFootprintService } from './carbon-footprint.service';
import { CarbonFootprintController } from './carbon-footprint.controller';

@Module({
  controllers: [CarbonFootprintController],
  providers: [CarbonFootprintService],
  exports: [CarbonFootprintService],
})
export class CarbonFootprintModule {}
