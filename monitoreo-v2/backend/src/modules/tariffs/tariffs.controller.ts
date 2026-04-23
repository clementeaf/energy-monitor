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
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { CreateTariffBlockDto } from './dto/create-tariff-block.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Tariffs')
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  @ApiOperation({ summary: 'List tariffs' })
  @ApiQuery({ name: 'buildingId', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'List of tariffs' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('billing', 'read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.tariffsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tariff by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tariff details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tariff not found' })
  @RequirePermission('billing', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const tariff = await this.tariffsService.findOne(id, user.tenantId, user.buildingIds);
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tariff' })
  @ApiResponse({ status: 201, description: 'Tariff created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('billing', 'create')
  async create(
    @Body() dto: CreateTariffDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tariffsService.create(user.tenantId, user.sub, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tariff' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Tariff updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tariff not found' })
  @RequirePermission('billing', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTariffDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const tariff = await this.tariffsService.update(id, user.tenantId, dto);
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tariff' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Tariff deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tariff not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('billing', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tariffsService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Tariff not found');
  }

  @Get(':id/blocks')
  @ApiOperation({ summary: 'List tariff blocks' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of tariff blocks' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @RequirePermission('billing', 'read')
  async findBlocks(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tariffsService.findBlocks(id, user.tenantId);
  }

  @Post(':id/blocks')
  @ApiOperation({ summary: 'Create a tariff block' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Tariff block created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tariff not found' })
  @RequirePermission('billing', 'create')
  async createBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateTariffBlockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const block = await this.tariffsService.createBlock(id, user.tenantId, dto);
    if (!block) throw new NotFoundException('Tariff not found');
    return block;
  }

  @Delete(':id/blocks/:blockId')
  @ApiOperation({ summary: 'Delete a tariff block' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'blockId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Tariff block deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Tariff block not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('billing', 'delete')
  async removeBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tariffsService.removeBlock(blockId, user.tenantId);
    if (!deleted) throw new NotFoundException('Tariff block not found');
  }
}
