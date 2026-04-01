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
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { CreateTariffBlockDto } from './dto/create-tariff-block.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  @RequirePermission('billing_tariffs', 'read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.tariffsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @RequirePermission('billing_tariffs', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const tariff = await this.tariffsService.findOne(id, user.tenantId, user.buildingIds);
    if (!tariff) throw new NotFoundException('Tariff not found');
    return tariff;
  }

  @Post()
  @RequirePermission('billing_tariffs', 'create')
  async create(
    @Body() dto: CreateTariffDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tariffsService.create(user.tenantId, user.sub, dto);
  }

  @Patch(':id')
  @RequirePermission('billing_tariffs', 'update')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('billing_tariffs', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tariffsService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Tariff not found');
  }

  @Get(':id/blocks')
  @RequirePermission('billing_tariffs', 'read')
  async findBlocks(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tariffsService.findBlocks(id, user.tenantId);
  }

  @Post(':id/blocks')
  @RequirePermission('billing_tariffs', 'create')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('billing_tariffs', 'delete')
  async removeBlock(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('blockId', ParseUUIDPipe) blockId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.tariffsService.removeBlock(blockId, user.tenantId);
    if (!deleted) throw new NotFoundException('Tariff block not found');
  }
}
