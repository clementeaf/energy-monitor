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
import { QueryMeterImportRowsDto } from './dto/query-meter-import-rows.dto';
import { MeterImportService } from './meter-import.service';
import { buildMeterImportTemplateCsv } from './meter-import.template';
import type { MeterImportUploadFile } from './meter-import.types';

@ApiTags('Meters — Import')
@Controller('meters/import')
export class MeterImportController {
  constructor(private readonly meterImportService: MeterImportService) {}

  @Get('template')
  @RequirePermission('admin_meters', 'read')
  @ApiOperation({ summary: 'Download CSV template for bulk meter import' })
  @ApiResponse({ status: 200, description: 'CSV attachment' })
  downloadTemplate(@Res() res: Response): void {
    const buffer = buildMeterImportTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="medidores-import-v1.csv"');
    res.send(buffer);
  }

  @Get()
  @RequirePermission('admin_meters', 'read')
  @ApiOperation({ summary: 'List meter import jobs for tenant' })
  listJobs(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.meterImportService.listJobs(
      user,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Post('validate')
  @RequirePermission('admin_meters', 'create')
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
  @ApiOperation({ summary: 'Upload CSV/XLSX and validate meter import rows' })
  validateUpload(
    @UploadedFile() file: MeterImportUploadFile,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.meterImportService.validateUpload(file, user);
  }

  @Get(':jobId')
  @RequirePermission('admin_meters', 'read')
  getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.meterImportService.getJob(jobId, user);
  }

  @Get(':jobId/rows')
  @RequirePermission('admin_meters', 'read')
  getJobRows(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: QueryMeterImportRowsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.meterImportService.getJobRows(jobId, user, query);
  }

  @Post(':jobId/commit')
  @RequirePermission('admin_meters', 'create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commit valid rows and create meters' })
  commitJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.meterImportService.commitJob(jobId, user);
  }

  @Delete(':jobId')
  @RequirePermission('admin_meters', 'create')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.meterImportService.cancelJob(jobId, user);
  }
}
