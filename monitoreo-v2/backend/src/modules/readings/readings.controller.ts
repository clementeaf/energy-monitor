import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ReadingsService } from './readings.service';
import { ReadingQueryDto } from './dto/reading-query.dto';
import { LatestQueryDto } from './dto/latest-query.dto';
import { AggregatedQueryDto } from './dto/aggregated-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';

@Controller('readings')
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Get()
  @RequireAnyPermission(
    'monitoring_realtime:read',
    'monitoring_drilldown:read',
    'dashboard_executive:read',
    'dashboard_technical:read',
  )
  async findByMeter(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReadingQueryDto,
  ) {
    if (new Date(query.to) < new Date(query.from)) {
      throw new BadRequestException('"to" must be after "from"');
    }
    return this.readingsService.findByMeter(user.tenantId, user.buildingIds, query);
  }

  @Get('latest')
  @RequireAnyPermission(
    'monitoring_realtime:read',
    'dashboard_executive:read',
    'dashboard_technical:read',
  )
  async findLatest(
    @CurrentUser() user: JwtPayload,
    @Query() query: LatestQueryDto,
  ) {
    return this.readingsService.findLatest(user.tenantId, user.buildingIds, query);
  }

  @Get('aggregated')
  @RequireAnyPermission(
    'monitoring_drilldown:read',
    'dashboard_executive:read',
    'dashboard_technical:read',
  )
  async findAggregated(
    @CurrentUser() user: JwtPayload,
    @Query() query: AggregatedQueryDto,
  ) {
    if (new Date(query.to) < new Date(query.from)) {
      throw new BadRequestException('"to" must be after "from"');
    }
    return this.readingsService.findAggregated(user.tenantId, user.buildingIds, query);
  }
}
