import { IsString, IsOptional, IsUUID, IsDateString, MaxLength } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  buildingId!: string;

  @IsOptional()
  @IsUUID()
  tariffId?: string;

  @IsString()
  @MaxLength(50)
  invoiceNumber!: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
