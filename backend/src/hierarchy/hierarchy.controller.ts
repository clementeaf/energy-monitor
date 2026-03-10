import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { HierarchyService } from './hierarchy.service';
import { RequirePermissions } from '../auth/require-permissions.decorator';
import { CurrentAuthContext } from '../auth/current-auth-context.decorator';
import type { AuthorizationContext } from '../auth/auth.service';

@ApiTags('Hierarchy')
@ApiBearerAuth()
@Controller('hierarchy')
export class HierarchyController {
  constructor(private readonly hierarchyService: HierarchyService) {}

  @Get(':buildingId')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Obtener árbol jerárquico de un edificio' })
  @ApiParam({ name: 'buildingId', example: 'pac4220' })
  async findTree(
    @Param('buildingId') buildingId: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
  ) {
    const tree = await this.hierarchyService.findTree(buildingId, authContext);
    if (!tree) throw new NotFoundException();
    return tree;
  }

  @Get('node/:nodeId')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Obtener nodo con path de ancestros' })
  @ApiParam({ name: 'nodeId', example: 'ST-ILUM' })
  async findNode(
    @Param('nodeId') nodeId: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
  ) {
    const result = await this.hierarchyService.findNode(nodeId, authContext);
    if (!result) throw new NotFoundException();
    return result;
  }

  @Get('node/:nodeId/children')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Obtener hijos directos con consumo agregado' })
  @ApiParam({ name: 'nodeId', example: 'TG-PAC4220' })
  @ApiQuery({ name: 'from', required: false, description: 'Inicio (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, description: 'Fin (ISO 8601)' })
  async findChildren(
    @Param('nodeId') nodeId: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const children = await this.hierarchyService.findChildrenWithConsumption(nodeId, authContext, from, to);
    if (!children) throw new NotFoundException();
    return children;
  }

  @Get('node/:nodeId/consumption')
  @RequirePermissions('MONITORING_DRILLDOWN', 'view')
  @ApiOperation({ summary: 'Time-series de consumo agregado del nodo' })
  @ApiParam({ name: 'nodeId', example: 'ST-ILUM' })
  @ApiQuery({ name: 'resolution', required: false, enum: ['hourly', 'daily'] })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  async findConsumption(
    @Param('nodeId') nodeId: string,
    @CurrentAuthContext() authContext: AuthorizationContext,
    @Query('resolution') resolution?: 'hourly' | 'daily',
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const consumption = await this.hierarchyService.findNodeConsumption(nodeId, authContext, resolution ?? 'hourly', from, to);
    if (!consumption) throw new NotFoundException();
    return consumption;
  }
}
