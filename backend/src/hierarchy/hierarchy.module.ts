import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HierarchyNode } from './hierarchy-node.entity';
import { Reading } from '../meters/reading.entity';
import { Meter } from '../meters/meter.entity';
import { HierarchyService } from './hierarchy.service';
import { HierarchyController } from './hierarchy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HierarchyNode, Reading, Meter])],
  controllers: [HierarchyController],
  providers: [HierarchyService],
  exports: [HierarchyService],
})
export class HierarchyModule {}
