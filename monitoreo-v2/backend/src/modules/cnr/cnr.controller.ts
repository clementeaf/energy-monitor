import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CnrService } from './cnr.service';
import { CreateCnrDto } from './dto/create-cnr.dto';
import { UpdateCnrStatusDto } from './dto/update-cnr-status.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('CNR Records')
@Controller('cnr')
export class CnrController {
  constructor(private readonly service: CnrService) {}

  @Get()
  @RequirePermission('monitoring', 'read')
  @ApiOperation({ summary: 'List CNR records' })
  @ApiResponse({ status: 200, description: 'CNR records list' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId, user.crossTenant);
  }

  @Post()
  @RequirePermission('monitoring', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create CNR record' })
  @ApiResponse({ status: 201, description: 'CNR created' })
  async create(
    @Body() dto: CreateCnrDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.create(dto, user.tenantId, user.sub);
  }

  @Patch(':id/status')
  @RequirePermission('monitoring', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update CNR status (approve/reject/review)' })
  @ApiResponse({ status: 200, description: 'CNR status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCnrStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateStatus(id, dto, user.sub);
  }
}
