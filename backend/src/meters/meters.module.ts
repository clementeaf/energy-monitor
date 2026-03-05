import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meter } from './meter.entity';
import { Reading } from './reading.entity';
import { MetersService } from './meters.service';
import { MetersController } from './meters.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Meter, Reading])],
  controllers: [MetersController],
  providers: [MetersService],
  exports: [MetersService],
})
export class MetersModule {}
