import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { RequirePermission } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  type JwtPayload,
} from '../../common/decorators/current-user.decorator';
import {
  VarelectricIngressService,
  type VarelectricIngestResult,
} from './varelectric-ingress.service';
import {
  CreateVarElectricDto,
  CreateVarElectricBatchDto,
} from './dto/create-var-electric.dto';

@ApiTags('Varelectric Ingress')
@ApiSecurity('api-key')
@Controller('v1/varelectric')
export class VarelectricIngressController {
  constructor(private readonly svc: VarelectricIngressService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('varelectric', 'create')
  @ApiOperation({
    summary:
      'Ingest one var_electric record into readings of the API key building',
  })
  createOne(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVarElectricDto,
  ): Promise<VarelectricIngestResult> {
    return this.svc.ingest(user, [dto]);
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('varelectric', 'create')
  @ApiOperation({
    summary:
      'Ingest up to 1000 var_electric records into readings of the API key building',
  })
  createBatch(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateVarElectricBatchDto,
  ): Promise<VarelectricIngestResult> {
    return this.svc.ingest(user, dto.records);
  }
}
