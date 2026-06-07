import { IsBoolean, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WEBHOOK_EVENT_TYPES } from '../../../common/constants/webhook-events';

export class CreateWebhookSubscriptionDto {
  @ApiProperty({ enum: WEBHOOK_EVENT_TYPES, example: 'reading.stale' })
  @IsIn([...WEBHOOK_EVENT_TYPES])
  eventType!: string;

  @ApiProperty({ example: 'https://hooks.example.com/energy-events' })
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  url!: string;

  @ApiProperty({ description: 'HMAC signing secret (min 16 chars)' })
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  secret!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
