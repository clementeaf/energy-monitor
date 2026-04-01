import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaultEvent } from '../platform/entities/fault-event.entity';
import { FaultEventsController } from './fault-events.controller';
import { FaultEventsService } from './fault-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([FaultEvent])],
  controllers: [FaultEventsController],
  providers: [FaultEventsService],
  exports: [FaultEventsService],
})
export class FaultEventsModule {}
