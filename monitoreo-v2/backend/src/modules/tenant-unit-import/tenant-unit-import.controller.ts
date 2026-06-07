import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { MAX_IMPORT_BYTES } from '../user-import/user-import.constants';
import { QueryTenantUnitImportRowsDto } from './dto/query-tenant-unit-import-rows.dto';
import { TenantUnitImportService } from './tenant-unit-import.service';
import { buildTenantUnitImportTemplateCsv } from './tenant-unit-import.template';
import type { TenantUnitImportUploadFile } from './tenant-unit-import.types';

@ApiTags('Tenant Units — Import')
@Controller('tenant-units/import')
export class TenantUnitImportController {
  constructor(private readonly tenantUnitImportService: TenantUnitImportService) {}

  @Get('template')
  @RequirePermission('admin_tenants_units', 'read')
  @ApiOperation({ summary: 'Download CSV template for bulk tenant unit import' })
  downloadTemplate(@Res() res: Response): void {
    const buffer = buildTenantUnitImportTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="locatarios-import-v1.csv"');
    res.send(buffer);
  }

  @Get()
  @RequirePermission('admin_tenants_units', 'read')
  listJobs(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tenantUnitImportService.listJobs(
      user,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Post('validate')
  @RequirePermission('admin_tenants_units', 'create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMPORT_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  validateUpload(
    @UploadedFile() file: TenantUnitImportUploadFile,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitImportService.validateUpload(file, user);
  }

  @Get(':jobId')
  @RequirePermission('admin_tenants_units', 'read')
  getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitImportService.getJob(jobId, user);
  }

  @Get(':jobId/rows')
  @RequirePermission('admin_tenants_units', 'read')
  getJobRows(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: QueryTenantUnitImportRowsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitImportService.getJobRows(jobId, user, query);
  }

  @Post(':jobId/commit')
  @RequirePermission('admin_tenants_units', 'create')
  @HttpCode(HttpStatus.OK)
  commitJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tenantUnitImportService.commitJob(jobId, user);
  }

  @Delete(':jobId')
  @RequirePermission('admin_tenants_units', 'create')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.tenantUnitImportService.cancelJob(jobId, user);
  }
}
