import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAlertRuleDto {
  @IsString()
  @MaxLength(50)
  alertTypeCode!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity!: string;

  @IsOptional()
  @IsUUID()
  buildingId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  checkIntervalSeconds?: number;

  @IsOptional()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(0)
  escalationL1Minutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  escalationL2Minutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  escalationL3Minutes?: number;

  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyPush?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyWhatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySms?: boolean;
}
