import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermission('audit', 'read')
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() dto: QueryAuditLogsDto,
  ) {
    return this.auditLogsService.findAll(user.tenantId, dto);
  }
}
