import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  NotFoundException,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { CreateHierarchyNodeDto } from './dto/create-hierarchy-node.dto';
import { UpdateHierarchyNodeDto } from './dto/update-hierarchy-node.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get('buildings/:buildingId')
  @RequirePermission('admin_hierarchy', 'read')
  async findByBuilding(
    @Param('buildingId', ParseUUIDPipe) buildingId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hierarchyService.findByBuilding(
      user.tenantId,
      buildingId,
      user.buildingIds,
    );
  }

  @Get(':id')
  @RequirePermission('admin_hierarchy', 'read')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const node = await this.hierarchyService.findOne(
      id,
      user.tenantId,
      user.buildingIds,
    );
    if (!node) throw new NotFoundException('Hierarchy node not found');
    return node;
  }

  @Get(':id/meters')
  @RequirePermission('admin_hierarchy', 'read')
  async findMetersByNode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hierarchyService.findMetersByNode(id, user.tenantId);
  }

  @Post()
  @RequirePermission('admin_hierarchy', 'create')
  async create(
    @Body() dto: CreateHierarchyNodeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hierarchyService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_hierarchy', 'update')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHierarchyNodeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const node = await this.hierarchyService.update(
      id,
      user.tenantId,
      dto,
    );
    if (!node) throw new NotFoundException('Hierarchy node not found');
    return node;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('admin_hierarchy', 'delete')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.hierarchyService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Hierarchy node not found');
  }
}
