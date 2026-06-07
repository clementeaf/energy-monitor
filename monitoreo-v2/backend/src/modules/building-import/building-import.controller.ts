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
import { QueryBuildingImportRowsDto } from './dto/query-building-import-rows.dto';
import { BuildingImportService } from './building-import.service';
import { buildBuildingImportTemplateCsv } from './building-import.template';
import type { BuildingImportUploadFile } from './building-import.types';

@ApiTags('Buildings — Import')
@Controller('buildings/import')
export class BuildingImportController {
  constructor(private readonly buildingImportService: BuildingImportService) {}

  @Get('template')
  @RequirePermission('admin_buildings', 'read')
  @ApiOperation({ summary: 'Download CSV template for bulk building import' })
  @ApiResponse({ status: 200, description: 'CSV attachment' })
  downloadTemplate(@Res() res: Response): void {
    const buffer = buildBuildingImportTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="edificios-import-v1.csv"');
    res.send(buffer);
  }

  @Get()
  @RequirePermission('admin_buildings', 'read')
  @ApiOperation({ summary: 'List building import jobs for tenant' })
  listJobs(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.buildingImportService.listJobs(
      user,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Post('validate')
  @RequirePermission('admin_buildings', 'create')
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
  @ApiOperation({ summary: 'Upload CSV/XLSX and validate building import rows' })
  validateUpload(
    @UploadedFile() file: BuildingImportUploadFile,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buildingImportService.validateUpload(file, user);
  }

  @Get(':jobId')
  @RequirePermission('admin_buildings', 'read')
  getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buildingImportService.getJob(jobId, user);
  }

  @Get(':jobId/rows')
  @RequirePermission('admin_buildings', 'read')
  getJobRows(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: QueryBuildingImportRowsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buildingImportService.getJobRows(jobId, user, query);
  }

  @Post(':jobId/commit')
  @RequirePermission('admin_buildings', 'create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commit valid rows and create buildings' })
  commitJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.buildingImportService.commitJob(jobId, user);
  }

  @Delete(':jobId')
  @RequirePermission('admin_buildings', 'create')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.buildingImportService.cancelJob(jobId, user);
  }
}
