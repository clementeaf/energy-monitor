import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from '../platform/entities/tariff.entity';
import { TariffBlock } from '../platform/entities/tariff-block.entity';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff, TariffBlock])],
  controllers: [TariffsController],
  providers: [TariffsService],
  exports: [TariffsService],
})
export class TariffsModule {}
