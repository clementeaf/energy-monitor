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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { HierarchyService } from './hierarchy.service';
import { CreateHierarchyNodeDto } from './dto/create-hierarchy-node.dto';
import { UpdateHierarchyNodeDto } from './dto/update-hierarchy-node.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Hierarchy')
@Controller('hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get('buildings/:buildingId')
  @RequirePermission('admin_hierarchy', 'read')
  @ApiOperation({ summary: 'Get hierarchy tree for a building' })
  @ApiParam({ name: 'buildingId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Hierarchy tree returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({ summary: 'Get a hierarchy node by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Hierarchy node returned' })
  @ApiResponse({ status: 404, description: 'Hierarchy node not found' })
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
  @ApiOperation({ summary: 'List meters under a hierarchy node' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Meters list returned' })
  async findMetersByNode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hierarchyService.findMetersByNode(id, user.tenantId);
  }

  @Post()
  @RequirePermission('admin_hierarchy', 'create')
  @ApiOperation({ summary: 'Create a hierarchy node' })
  @ApiResponse({ status: 201, description: 'Node created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Body() dto: CreateHierarchyNodeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.hierarchyService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_hierarchy', 'update')
  @ApiOperation({ summary: 'Update a hierarchy node' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Node updated' })
  @ApiResponse({ status: 404, description: 'Hierarchy node not found' })
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
  @ApiOperation({ summary: 'Delete a hierarchy node' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Node deleted' })
  @ApiResponse({ status: 404, description: 'Hierarchy node not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const deleted = await this.hierarchyService.remove(id, user.tenantId);
    if (!deleted) throw new NotFoundException('Hierarchy node not found');
  }
}
