import { Module } from '@nestjs/common';
import { DbVerifyController } from './db-verify.controller';
import { DbVerifyService } from './db-verify.service';

@Module({
  controllers: [DbVerifyController],
  providers: [DbVerifyService],
})
export class DbVerifyModule {}
