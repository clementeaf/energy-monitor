import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateBreachReportDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @IsArray()
  @IsString({ each: true })
  dataTypesAffected!: string[];

  @IsOptional()
  @IsPositive()
  estimatedSubjects?: number;

  @IsIn(['low', 'medium', 'high', 'critical'])
  severity!: 'low' | 'medium' | 'high' | 'critical';

  @IsDateString()
  detectedAt!: string;
}

export class UpdateBreachReportDto {
  @IsOptional()
  @IsIn(['notified', 'resolved'])
  status?: 'notified' | 'resolved';

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resolutionNotes?: string;

  @IsOptional()
  @IsDateString()
  agencyNotifiedAt?: string;

  @IsOptional()
  @IsDateString()
  subjectsNotifiedAt?: string;
}
