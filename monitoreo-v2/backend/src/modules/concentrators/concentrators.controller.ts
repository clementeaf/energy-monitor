import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ConcentratorsService } from './concentrators.service';
import { CreateConcentratorDto } from './dto/create-concentrator.dto';
import { UpdateConcentratorDto } from './dto/update-concentrator.dto';
import { AddConcentratorMeterDto } from './dto/add-concentrator-meter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireAnyPermission,
} from '../../common/guards/permissions.guard';

@ApiTags('Concentrators')
@Controller('concentrators')
export class ConcentratorsController {
  constructor(private readonly concentratorsService: ConcentratorsService) {}

  @Get()
  @RequireAnyPermission('diagnostics:read', 'admin_meters:read')
  @ApiOperation({ summary: 'List all concentrators' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Concentrators list returned' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.concentratorsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @RequireAnyPermission('diagnostics:read', 'admin_meters:read')
  @ApiOperation({ summary: 'Get a concentrator by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Concentrator returned' })
  @ApiResponse({ status: 404, description: 'Concentrator not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const concentrator = await this.concentratorsService.findOne(id, user.tenantId, user.buildingIds);
    if (!concentrator) throw new NotFoundException('Concentrator not found');
    return concentrator;
  }

  @Post()
  @RequirePermission('admin_meters', 'create')
  @ApiOperation({ summary: 'Create a concentrator' })
  @ApiResponse({ status: 201, description: 'Concentrator created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() dto: CreateConcentratorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.concentratorsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_meters', 'update')
  @ApiOperation({ summary: 'Update a concentrator' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Concentrator updated' })
  @ApiResponse({ status: 404, description: 'Concentrator not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConcentratorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const concentrator = await this.concentratorsService.update(id, user.tenantId, dto);
    if (!concentrator) throw new NotFoundException('Concentrator not found');
    return concentrator;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_meters', 'delete')
  @ApiOperation({ summary: 'Delete a concentrator' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Concentrator deleted' })
  @ApiResponse({ status: 404, description: 'Concentrator not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.concentratorsService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Concentrator not found');
  }

  @Get(':id/meters')
  @RequireAnyPermission('diagnostics:read', 'admin_meters:read')
  @ApiOperation({ summary: 'List meters linked to a concentrator' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meters list returned' })
  async findMeters(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.concentratorsService.findMeters(id, user.tenantId);
  }

  @Post(':id/meters')
  @RequirePermission('admin_meters', 'update')
  @ApiOperation({ summary: 'Add a meter to a concentrator' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Meter linked' })
  @ApiResponse({ status: 404, description: 'Concentrator not found' })
  async addMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddConcentratorMeterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const entry = await this.concentratorsService.addMeter(id, dto, user.tenantId);
    if (!entry) throw new NotFoundException('Concentrator not found');
    return entry;
  }

  @Delete(':id/meters/:meterId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_meters', 'update')
  @ApiOperation({ summary: 'Remove a meter from a concentrator' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'meterId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Meter unlinked' })
  @ApiResponse({ status: 404, description: 'Concentrator or meter link not found' })
  async removeMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meterId', ParseUUIDPipe) meterId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.concentratorsService.removeMeter(id, meterId, user.tenantId);
    if (!deleted) throw new NotFoundException('Concentrator or meter link not found');
  }
}
