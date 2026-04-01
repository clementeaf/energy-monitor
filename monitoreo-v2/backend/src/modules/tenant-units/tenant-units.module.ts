import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantUnit } from '../platform/entities/tenant-unit.entity';
import { TenantUnitMeter } from '../platform/entities/tenant-unit-meter.entity';
import { TenantUnitsController } from './tenant-units.controller';
import { TenantUnitsService } from './tenant-units.service';

@Module({
  imports: [TypeOrmModule.forFeature([TenantUnit, TenantUnitMeter])],
  controllers: [TenantUnitsController],
  providers: [TenantUnitsService],
  exports: [TenantUnitsService],
})
export class TenantUnitsModule {}
