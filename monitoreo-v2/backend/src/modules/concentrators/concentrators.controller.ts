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
import { ConcentratorsService } from './concentrators.service';
import { CreateConcentratorDto } from './dto/create-concentrator.dto';
import { UpdateConcentratorDto } from './dto/update-concentrator.dto';
import { AddConcentratorMeterDto } from './dto/add-concentrator-meter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('concentrators')
export class ConcentratorsController {
  constructor(private readonly concentratorsService: ConcentratorsService) {}

  @Get()
  @RequirePermission('admin_concentrators', 'read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.concentratorsService.findAll(user.tenantId, user.buildingIds, buildingId);
  }

  @Get(':id')
  @RequirePermission('admin_concentrators', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const concentrator = await this.concentratorsService.findOne(id, user.tenantId, user.buildingIds);
    if (!concentrator) throw new NotFoundException('Concentrator not found');
    return concentrator;
  }

  @Post()
  @RequirePermission('admin_concentrators', 'create')
  async create(
    @Body() dto: CreateConcentratorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.concentratorsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_concentrators', 'update')
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
  @RequirePermission('admin_concentrators', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.concentratorsService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Concentrator not found');
  }

  @Get(':id/meters')
  @RequirePermission('admin_concentrators', 'read')
  async findMeters(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.concentratorsService.findMeters(id, user.tenantId);
  }

  @Post(':id/meters')
  @RequirePermission('admin_concentrators', 'update')
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
  @RequirePermission('admin_concentrators', 'update')
  async removeMeter(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('meterId', ParseUUIDPipe) meterId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.concentratorsService.removeMeter(id, meterId, user.tenantId);
    if (!deleted) throw new NotFoundException('Concentrator or meter link not found');
  }
}
