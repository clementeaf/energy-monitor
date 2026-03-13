import { ApiProperty } from '@nestjs/swagger';

export class BillingCenterSummaryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'Parque Arauco Kennedy' })
  centerName!: string;

  @ApiProperty({ example: 2025 })
  year!: number;

  @ApiProperty({ example: 1 })
  month!: number;

  @ApiProperty({ nullable: true })
  totalConsumptionKwh!: number | null;

  @ApiProperty({ nullable: true })
  peakMaxKw!: number | null;

  @ApiProperty({ nullable: true })
  demandPuntaKwh!: number | null;

  @ApiProperty({ nullable: true })
  pctPunta!: number | null;

  @ApiProperty({ nullable: true })
  avgDailyKwh!: number | null;

  @ApiProperty({ nullable: true })
  topConsumerLocal!: string | null;
}

export class BillingMonthlyDetailDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  centerName!: string;

  @ApiProperty()
  year!: number;

  @ApiProperty()
  month!: number;

  @ApiProperty({ example: 'MG-001' })
  meterId!: string;

  @ApiProperty({ nullable: true })
  storeType!: string | null;

  @ApiProperty({ nullable: true })
  storeName!: string | null;

  @ApiProperty({ nullable: true })
  phase!: string | null;

  @ApiProperty({ nullable: true })
  consumptionKwh!: number | null;

  @ApiProperty({ nullable: true })
  peakKw!: number | null;

  @ApiProperty({ nullable: true })
  demandPuntaKwh!: number | null;

  @ApiProperty({ nullable: true })
  pctPunta!: number | null;

  @ApiProperty({ nullable: true })
  avgDailyKwh!: number | null;

  @ApiProperty({ nullable: true })
  energyChargeClp!: number | null;

  @ApiProperty({ nullable: true })
  demandMaxKw!: number | null;

  @ApiProperty({ nullable: true })
  demandPuntaKw!: number | null;

  @ApiProperty({ nullable: true })
  fixedChargeClp!: number | null;

  @ApiProperty({ nullable: true })
  totalNetClp!: number | null;

  @ApiProperty({ nullable: true })
  ivaClp!: number | null;

  @ApiProperty({ nullable: true })
  totalWithIvaClp!: number | null;
}

export class BillingTariffDto {
  @ApiProperty()
  id!: number;

  @ApiProperty({ example: 'Las Condes' })
  tariffName!: string;

  @ApiProperty()
  year!: number;

  @ApiProperty()
  month!: number;

  @ApiProperty({ nullable: true })
  consumptionEnergyKwh!: number | null;

  @ApiProperty({ nullable: true })
  demandMaxKw!: number | null;

  @ApiProperty({ nullable: true })
  demandPuntaKw!: number | null;

  @ApiProperty({ nullable: true })
  kwhTroncal!: number | null;

  @ApiProperty({ nullable: true })
  fixedChargeClp!: number | null;
}
