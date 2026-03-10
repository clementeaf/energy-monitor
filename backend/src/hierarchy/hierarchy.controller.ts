import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { HierarchyService } from './hierarchy.service';
import { RequirePermissions } from '../auth/require-permissions.decorator';

@ApiTags('Hierarchy')
@ApiBearerAuth()
@Controller('hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get(':buildingId')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Obtener árbol jerárquico de un edificio' })
  @ApiParam({ name: 'buildingId', example: 'pac4220' })
  findTree(@Param('buildingId') buildingId: string) {
    return this.hierarchyService.findTree(buildingId);
  }

  @Get('node/:nodeId')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Obtener nodo con path de ancestros' })
  @ApiParam({ name: 'nodeId', example: 'ST-ILUM' })
  async findNode(@Param('nodeId') nodeId: string) {
    const result = await this.hierarchyService.findNode(nodeId);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Get('node/:nodeId/children')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Obtener hijos directos con consumo agregado' })
  @ApiParam({ name: 'nodeId', example: 'TG-PAC4220' })
  @ApiQuery({ name: 'from', required: false, description: 'Inicio (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'Fin (ISO 8601)' })
  findChildren(
    @Param('nodeId') nodeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.hierarchyService.findChildrenWithConsumption(nodeId, from, to);
  }

  @Get('node/:nodeId/consumption')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Time-series de consumo agregado del nodo' })
  @ApiParam({ name: 'nodeId', example: 'ST-ILUM' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['hourly', 'daily'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findConsumption(
    @Param('nodeId') nodeId: string,
    @Query('resolution') resolution?: 'hourly' | 'daily',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.hierarchyService.findNodeConsumption(nodeId, resolution ?? 'hourly', from, to);
  }
}
