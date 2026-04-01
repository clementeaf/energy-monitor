import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FaultEventsService } from './fault-events.service';
import { QueryFaultEventsDto } from './dto/query-fault-events.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('fault-events')
export class FaultEventsController {
  constructor(private readonly faultEventsService: FaultEventsService) {}

  @Get()
  @RequirePermission('monitoring_faults', 'read')
  async findAll(
    @Query() query: QueryFaultEventsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.faultEventsService.findAll(
      user.tenantId,
      user.buildingIds,
      query,
    );
  }

  @Get(':id')
  @RequirePermission('monitoring_faults', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const event = await this.faultEventsService.findOne(
      id,
      user.tenantId,
      user.buildingIds,
    );
    if (!event) throw new NotFoundException('Fault event not found');
    return event;
  }
}
