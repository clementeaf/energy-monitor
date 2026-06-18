import { Module } from '@nestjs/common';
import { MapvxService } from './mapvx.service';
import { MapvxController } from './mapvx.controller';

@Module({
  controllers: [MapvxController],
  providers: [MapvxService],
})
export class MapvxModule {}
