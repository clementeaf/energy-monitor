import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BackfillJobsService } from './backfill-jobs.service';
import { CreateBackfillJobDto } from './dto/create-backfill-job.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Admin — Backfill Jobs')
@Controller('admin/backfill-jobs')
export class BackfillJobsController {
  constructor(private readonly backfillJobsService: BackfillJobsService) {}

  @Get()
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'List backfill jobs for tenant' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.backfillJobsService.findAll(user.tenantId);
  }

  @Post()
  @RequirePermission('integrations', 'create')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue a backfill job (super_admin / integrations create)' })
  @ApiResponse({ status: 202, description: 'Job accepted' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBackfillJobDto,
  ) {
    return this.backfillJobsService.create(user.tenantId, dto);
  }

  @Post(':id/process')
  @RequirePermission('integrations', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run backfill worker stub for a job' })
  async process(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.backfillJobsService.processJob(id, user.tenantId);
  }
}
