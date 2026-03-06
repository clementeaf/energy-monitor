import { ApiProperty } from '@nestjs/swagger';

export class BuildingSummaryDto {
  @ApiProperty({ example: 'pac4220' })
  id!: string;

  @ApiProperty({ example: 'Edificio PAC 4220' })
  name!: string;

  @ApiProperty({ example: 'Av. Principal 4220' })
  address!: string;

  @ApiProperty({ example: 1200.5 })
  totalArea!: number;

  @ApiProperty({ example: 15 })
  metersCount!: number;
}

export class ConsumptionPointDto {
  @ApiProperty({ example: '2026-03-06T14:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 42.567 })
  totalPowerKw!: number;

  @ApiProperty({ example: 2.838 })
  avgPowerKw!: number;

  @ApiProperty({ example: 8.123 })
  peakPowerKw!: number;
}
