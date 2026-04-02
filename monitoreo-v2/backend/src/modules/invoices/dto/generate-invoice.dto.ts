import { IsUUID, IsDateString, IsOptional, IsArray } from 'class-validator';

export class GenerateInvoiceDto {
  @IsUUID()
  buildingId!: string;

  @IsUUID()
  tariffId!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  meterIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tenantUnitIds?: string[];
}
