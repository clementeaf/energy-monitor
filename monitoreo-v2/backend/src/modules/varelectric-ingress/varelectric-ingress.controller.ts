import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { RequirePermission } from '../../common/guards/permissions.guard';
import { VarelectricIngressService } from './varelectric-ingress.service';
import { CreateVarElectricDto, CreateVarElectricBatchDto } from './dto/create-var-electric.dto';

@ApiTags('Varelectric Ingress')
@ApiSecurity('api-key')
@Controller('api/v1/varelectric')
export class VarelectricIngressController {
  constructor(private readonly svc: VarelectricIngressService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('varelectric', 'create')
  @ApiOperation({ summary: 'Insert single var_electric record' })
  async createOne(@Body() dto: CreateVarElectricDto) {
    await this.svc.insertOne(dto);
    return { ok: true };
  }

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('varelectric', 'create')
  @ApiOperation({ summary: 'Insert batch of var_electric records (max 1000)' })
  async createBatch(@Body() dto: CreateVarElectricBatchDto) {
    if (dto.records.length > 1000) {
      return { error: 'Max 1000 records per batch' };
    }
    return this.svc.insertBatch(dto.records);
  }
}
