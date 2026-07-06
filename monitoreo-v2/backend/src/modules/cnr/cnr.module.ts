import { Module } from '@nestjs/common';
import { CnrController } from './cnr.controller';
import { CnrService } from './cnr.service';

@Module({
  controllers: [CnrController],
  providers: [CnrService],
})
export class CnrModule {}
