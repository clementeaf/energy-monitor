import {
  Body,
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
import { MAX_IMPORT_BYTES } from './user-import.constants';
import { CommitUserImportDto } from './dto/commit-user-import.dto';
import { QueryUserImportRowsDto } from './dto/query-user-import-rows.dto';
import { UserImportService } from './user-import.service';
import { buildUserImportTemplateCsv } from './user-import.template';
import type { UserImportUploadFile } from './user-import.types';

@ApiTags('Users — Import')
@Controller('users/import')
export class UserImportController {
  constructor(private readonly userImportService: UserImportService) {}

  @Get('template')
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'Download CSV template for bulk user import' })
  @ApiResponse({ status: 200, description: 'CSV attachment' })
  downloadTemplate(@Res() res: Response): void {
    const buffer = buildUserImportTemplateCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios-import-v1.csv"');
    res.send(buffer);
  }

  @Get()
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'List user import jobs for tenant' })
  @ApiResponse({ status: 200, description: 'Paginated import jobs' })
  listJobs(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.userImportService.listJobs(
      user,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Post('validate')
  @RequirePermission('admin_users', 'create')
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
  @ApiOperation({ summary: 'Upload CSV/XLSX and validate user import rows' })
  @ApiResponse({ status: 201, description: 'Job created with validation summary' })
  validateUpload(
    @UploadedFile() file: UserImportUploadFile,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userImportService.validateUpload(file, user);
  }

  @Get(':jobId')
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'Get import job metadata and summary' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userImportService.getJob(jobId, user);
  }

  @Get(':jobId/rows')
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'Paginated staging rows for import preview' })
  getJobRows(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: QueryUserImportRowsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.userImportService.getJobRows(jobId, user, query);
  }

  @Post(':jobId/commit')
  @RequirePermission('admin_users', 'create')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commit valid rows and create users' })
  @ApiResponse({ status: 400, description: 'ageVerified required' })
  @ApiResponse({ status: 409, description: 'Job not in ready state' })
  commitJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: CommitUserImportDto,
  ) {
    return this.userImportService.commitJob(jobId, user, body.ageVerified);
  }

  @Delete(':jobId')
  @RequirePermission('admin_users', 'create')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a draft import job' })
  @ApiResponse({ status: 204, description: 'Job cancelled' })
  async cancelJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.userImportService.cancelJob(jobId, user);
  }
}
