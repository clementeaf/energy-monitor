import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { IngestGapsAdminService } from './ingest-gaps-admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Admin — Ingest Gaps')
@Controller('admin/ingest-gaps')
export class IngestGapsAdminController {
  constructor(private readonly ingestGapsAdminService: IngestGapsAdminService) {}

  @Get()
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'List open/resolved ingest gaps for tenant' })
  @ApiQuery({ name: 'status', required: false, enum: ['open', 'resolved'] })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiResponse({ status: 200, description: 'Paginated ingest gaps' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: 'open' | 'resolved',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.ingestGapsAdminService.findAll(user.tenantId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
