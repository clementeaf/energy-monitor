import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeletionRequestsService } from './deletion-requests.service';
import { ResolveDeletionDto } from './dto/resolve-deletion.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Deletion Requests (Ley 21.719)')
@Controller('deletion-requests')
export class DeletionRequestsController {
  constructor(private readonly service: DeletionRequestsService) {}

  @Get()
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'List deletion requests (admin)' })
  @ApiResponse({ status: 200, description: 'Deletion requests list' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Patch(':id/resolve')
  @RequirePermission('admin_users', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a deletion request' })
  @ApiResponse({ status: 200, description: 'Request resolved' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveDeletionDto,
  ) {
    return this.service.resolve(id, user.sub, dto);
  }

  @Patch(':id/execute')
  @RequirePermission('admin_users', 'delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute approved deletion — anonymize PII (irreversible)' })
  @ApiResponse({ status: 200, description: 'User PII anonymized' })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.execute(id, user.sub);
  }
}
