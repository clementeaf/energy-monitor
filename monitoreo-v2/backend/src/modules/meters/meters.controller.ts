import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MetersService } from './meters.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../../common/guards/permissions.guard';

@ApiTags('Meters')
@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get()
  @ApiOperation({ summary: 'List all meters, optionally filtered by building' })
  @ApiQuery({ name: 'buildingId', required: false, description: 'Filter by building UUID' })
  @ApiResponse({ status: 200, description: 'List of meters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequireAnyPermission('admin_meters:read', 'dashboard_executive:read', 'dashboard_technical:read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.metersService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a meter by ID' })
  @ApiResponse({ status: 200, description: 'Meter found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Meter not found' })
  @RequireAnyPermission('admin_meters:read', 'dashboard_executive:read', 'dashboard_technical:read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const meter = await this.metersService.findOne(id, user.tenantId, user.buildingIds);
    if (!meter) throw new NotFoundException('Meter not found');
    return meter;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new meter' })
  @ApiResponse({ status: 201, description: 'Meter created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('admin_meters', 'create')
  async create(
    @Body() dto: CreateMeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.metersService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meter' })
  @ApiResponse({ status: 200, description: 'Meter updated' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Meter not found' })
  @RequirePermission('admin_meters', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const meter = await this.metersService.update(id, user.tenantId, dto);
    if (!meter) throw new NotFoundException('Meter not found');
    return meter;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meter' })
  @ApiResponse({ status: 204, description: 'Meter deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Meter not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_meters', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.metersService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Meter not found');
  }
}
