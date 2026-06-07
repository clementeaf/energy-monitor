import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WEBHOOK_EVENT_TYPES } from '../../../common/constants/webhook-events';

export class QueryWebhookSubscriptionsDto {
  @ApiPropertyOptional({ enum: WEBHOOK_EVENT_TYPES })
  @IsOptional()
  @IsIn([...WEBHOOK_EVENT_TYPES])
  eventType?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: string;
}
