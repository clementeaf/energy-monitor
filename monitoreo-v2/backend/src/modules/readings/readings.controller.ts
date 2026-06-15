import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ReadingsService } from './readings.service';
import { CnrReadingsService } from './cnr-readings.service';
import { ReadingQueryDto } from './dto/reading-query.dto';
import { LatestQueryDto } from './dto/latest-query.dto';
import { AggregatedQueryDto } from './dto/aggregated-query.dto';
import { CompareBuildingsQueryDto } from './dto/compare-buildings-query.dto';
import { CreateCnrReadingDto } from './dto/create-cnr-reading.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequireAnyPermission, RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Readings')
@Controller('readings')
export class ReadingsController {
  constructor(
    private readonly readingsService: ReadingsService,
    private readonly cnrReadingsService: CnrReadingsService,
  ) {}

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

  @Get('latest-anchor')
  @ApiOperation({ summary: 'Get newest reading timestamp for chart date anchoring' })
  @ApiResponse({ status: 200, description: 'Latest timestamp anchor returned' })
  @RequireAnyPermission(
    'dashboard_executive:read',
    'dashboard_technical:read',
  )
  async findLatestAnchor(@CurrentUser() user: JwtPayload) {
    return this.readingsService.findLatestAnchor(user.tenantId, user.buildingIds, user.crossTenant);
  }

  @Get('compare-buildings')
  @ApiOperation({ summary: 'Compare dashboard bundle (anchor + building aggregates × 2 periods)' })
  @ApiResponse({ status: 200, description: 'Compare dashboard data returned' })
  @RequireAnyPermission(
    'dashboard_executive:read',
    'dashboard_technical:read',
  )
  async findCompareBuildings(
    @CurrentUser() user: JwtPayload,
    @Query() query: CompareBuildingsQueryDto,
  ) {
    return this.readingsService.findCompareBuildings(
      user.tenantId,
      user.buildingIds,
      query.days,
      user.crossTenant,
    );
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
    return this.readingsService.findAggregated(user.tenantId, user.buildingIds, query, user.crossTenant);
  }

  @Post('manual-cnr')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Insert manual CNR reading (Consumo No Registrado)' })
  @ApiResponse({ status: 201, description: 'CNR reading created with audit trail' })
  @ApiResponse({ status: 403, description: 'Meter not accessible' })
  @ApiResponse({ status: 409, description: 'Duplicate reading' })
  @RequirePermission('readings', 'create')
  async createCnrReading(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCnrReadingDto,
  ) {
    return this.cnrReadingsService.create(user.tenantId, user.buildingIds, user.sub, dto);
  }
}
