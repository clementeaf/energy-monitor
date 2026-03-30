import { IsOptional, IsString } from 'class-validator';

export class AcknowledgeAlertDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
