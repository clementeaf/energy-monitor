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
import { RectificationRequestsService } from './rectification-requests.service';
import { ResolveRectificationDto } from './dto/resolve-rectification.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Rectification Requests (Ley 21.719)')
@Controller('rectification-requests')
export class RectificationRequestsController {
  constructor(private readonly service: RectificationRequestsService) {}

  @Get()
  @RequirePermission('admin_users', 'read')
  @ApiOperation({ summary: 'List rectification requests (admin)' })
  @ApiResponse({ status: 200, description: 'Rectification requests list' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user.tenantId);
  }

  @Patch(':id/resolve')
  @RequirePermission('admin_users', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject a rectification request' })
  @ApiResponse({ status: 200, description: 'Request resolved' })
  async resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ResolveRectificationDto,
  ) {
    return this.service.resolve(id, user.sub, dto);
  }

  @Patch(':id/execute')
  @RequirePermission('admin_users', 'update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute approved rectification — apply data change' })
  @ApiResponse({ status: 200, description: 'Rectification applied' })
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.execute(id, user.sub);
  }
}
