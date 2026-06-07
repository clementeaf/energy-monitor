import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { RegisterMappingsService } from './register-mappings.service';
import { CreateRegisterMappingDto } from './dto/create-register-mapping.dto';
import { UpdateRegisterMappingDto } from './dto/update-register-mapping.dto';
import { QueryRegisterMappingsDto } from './dto/query-register-mappings.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('Register Mappings')
@Controller('register-mappings')
export class RegisterMappingsController {
  constructor(private readonly registerMappingsService: RegisterMappingsService) {}

  @Get('protocol-types')
  @RequirePermission('register_mappings', 'read')
  @ApiOperation({ summary: 'List supported protocol types' })
  @ApiResponse({ status: 200, description: 'Protocol catalog returned' })
  listProtocolTypes() {
    return this.registerMappingsService.listProtocolTypes();
  }

  @Get('export')
  @RequirePermission('register_mappings', 'read')
  @ApiOperation({ summary: 'Export register mappings as CSV (equivalence matrix)' })
  @ApiResponse({ status: 200, description: 'CSV file download' })
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryRegisterMappingsDto,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.registerMappingsService.exportCsv(user, query);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="register-mappings.csv"',
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  @Get()
  @RequirePermission('register_mappings', 'read')
  @ApiOperation({ summary: 'List register mappings (tenant + global templates)' })
  @ApiQuery({ name: 'protocol', required: false })
  @ApiQuery({ name: 'deviceProfile', required: false })
  @ApiResponse({ status: 200, description: 'Mappings list returned' })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryRegisterMappingsDto) {
    return this.registerMappingsService.findAll(user, query);
  }

  @Get(':id')
  @RequirePermission('register_mappings', 'read')
  @ApiOperation({ summary: 'Get register mapping by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const row = await this.registerMappingsService.findOne(id, user);
    if (!row) throw new NotFoundException('Register mapping not found');
    return row;
  }

  @Post()
  @RequirePermission('register_mappings', 'create')
  @ApiOperation({ summary: 'Create register mapping (tenant or global template)' })
  @ApiResponse({ status: 201, description: 'Mapping created' })
  @ApiResponse({ status: 409, description: 'Duplicate mapping key' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRegisterMappingDto) {
    return this.registerMappingsService.create(user, dto);
  }

  @Patch(':id')
  @RequirePermission('register_mappings', 'update')
  @ApiOperation({ summary: 'Update register mapping' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRegisterMappingDto,
  ) {
    const row = await this.registerMappingsService.update(id, user, dto);
    if (!row) throw new NotFoundException('Register mapping not found');
    return row;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('register_mappings', 'delete')
  @ApiOperation({ summary: 'Delete register mapping' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    const deleted = await this.registerMappingsService.remove(id, user);
    if (!deleted) throw new NotFoundException('Register mapping not found');
  }
}
