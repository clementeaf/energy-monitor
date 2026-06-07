import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WEBHOOK_EVENT_TYPES } from '../../../common/constants/webhook-events';

export class UpdateWebhookSubscriptionDto {
  @ApiPropertyOptional({ enum: WEBHOOK_EVENT_TYPES })
  @IsOptional()
  @IsIn([...WEBHOOK_EVENT_TYPES])
  eventType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
