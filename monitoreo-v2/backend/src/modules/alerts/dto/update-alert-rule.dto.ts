import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAlertRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['critical', 'high', 'medium', 'low'])
  severity?: string;

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
