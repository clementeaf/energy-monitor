import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../platform/entities/invoice.entity';
import { InvoiceLineItem } from '../platform/entities/invoice-line-item.entity';
import { Meter } from '../platform/entities/meter.entity';
import { Tariff } from '../platform/entities/tariff.entity';
import { TariffBlock } from '../platform/entities/tariff-block.entity';
import { TenantUnitMeter } from '../platform/entities/tenant-unit-meter.entity';
import { Reading } from '../platform/entities/reading.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceLineItem,
      Meter,
      Tariff,
      TariffBlock,
      TenantUnitMeter,
      Reading,
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
