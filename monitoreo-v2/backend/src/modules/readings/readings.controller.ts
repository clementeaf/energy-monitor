import {
  Controller,
  Get,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReadingsService } from './readings.service';
import { ReadingQueryDto } from './dto/reading-query.dto';
import { LatestQueryDto } from './dto/latest-query.dto';
import { AggregatedQueryDto } from './dto/aggregated-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';

@ApiTags('Readings')
@Controller('readings')
export class ReadingsController {
  constructor(private readonly readingsService: ReadingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get time-series readings for a meter' })
  @ApiResponse({ status: 200, description: 'Readings returned with downsampling' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequireAnyPermission(
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
  @ApiOperation({ summary: 'Get the latest reading per meter' })
  @ApiResponse({ status: 200, description: 'Latest readings returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequireAnyPermission(
    'dashboard_executive:read',
    'dashboard_technical:read',
  )
  async findLatest(
    @CurrentUser() user: JwtPayload,
    @Query() query: LatestQueryDto,
  ) {
    return this.readingsService.findLatest(user.tenantId, user.buildingIds, query, user.crossTenant);
  }

  @Get('aggregated')
  @ApiOperation({ summary: 'Get aggregated readings (hourly, daily, or monthly)' })
  @ApiResponse({ status: 200, description: 'Aggregated readings returned' })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequireAnyPermission(
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
