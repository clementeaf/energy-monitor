import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Building } from '../platform/entities/building.entity';
import { BuildingHierarchy } from '../platform/entities/building-hierarchy.entity';
import { MeterHierarchy } from '../platform/entities/meter-hierarchy.entity';
import { HierarchyController } from './hierarchy.controller';
import { HierarchyService } from './hierarchy.service';

@Module({
  imports: [TypeOrmModule.forFeature([Building, BuildingHierarchy, MeterHierarchy])],
  controllers: [HierarchyController],
  providers: [HierarchyService],
  exports: [HierarchyService],
})
export class HierarchyModule {}
