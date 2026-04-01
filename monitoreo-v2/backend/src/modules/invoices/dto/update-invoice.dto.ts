import { IsString, IsOptional, IsUUID, IsDateString, IsNumber } from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID()
  tariffId?: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  totalNet?: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  total?: number;
}
