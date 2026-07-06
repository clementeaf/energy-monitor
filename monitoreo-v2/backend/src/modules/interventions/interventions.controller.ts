import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InterventionsService } from './interventions.service';
import { CreateInterventionDto } from './dto/create-intervention.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Interventions')
@Controller('interventions')
export class InterventionsController {
  constructor(private readonly service: InterventionsService) {}

  @Get()
  @RequirePermission('monitoring', 'read')
  @ApiOperation({ summary: 'List intervention records' })
  @ApiResponse({ status: 200, description: 'Intervention list' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId, user.crossTenant);
  }

  @Post()
  @RequirePermission('monitoring', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register intervention' })
  @ApiResponse({ status: 201, description: 'Intervention created' })
  async create(@Body() dto: CreateInterventionDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.tenantId, user.sub);
  }
}
