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
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OAuthClientsService } from './oauth-clients.service';
import { CreateOAuthClientDto } from './dto/create-oauth-client.dto';
import { UpdateOAuthClientDto } from './dto/update-oauth-client.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('OAuth Clients')
@Controller('oauth-clients')
export class OAuthClientsController {
  constructor(private readonly oauthClientsService: OAuthClientsService) {}

  @Get()
  @RequirePermission('oauth_clients', 'read')
  @ApiOperation({ summary: 'List OAuth2 clients for tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.oauthClientsService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('oauth_clients', 'read')
  @ApiOperation({ summary: 'Get OAuth2 client by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const row = await this.oauthClientsService.findOne(id, user.tenantId);
    if (!row) throw new NotFoundException('OAuth client not found');
    return row;
  }

  @Post()
  @RequirePermission('oauth_clients', 'create')
  @ApiOperation({ summary: 'Create OAuth2 client (secret returned once)' })
  @ApiResponse({ status: 201, description: 'Client created with client_id and client_secret' })
  async create(@Body() dto: CreateOAuthClientDto, @CurrentUser() user: JwtPayload) {
    const result = await this.oauthClientsService.create(user.tenantId, dto, user.sub);
    return {
      clientId: result.clientId,
      clientSecret: result.clientSecret,
      client: result.client,
    };
  }

  @Patch(':id')
  @RequirePermission('oauth_clients', 'update')
  @ApiOperation({ summary: 'Update OAuth2 client scopes or status' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOAuthClientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const row = await this.oauthClientsService.update(id, user.tenantId, dto);
    if (!row) throw new NotFoundException('OAuth client not found');
    return row;
  }

  @Post(':id/rotate')
  @RequirePermission('oauth_clients', 'update')
  @ApiOperation({ summary: 'Rotate client secret (returned once)' })
  async rotate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.oauthClientsService.rotateSecret(id, user.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('oauth_clients', 'update')
  @ApiOperation({ summary: 'Delete OAuth2 client' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.oauthClientsService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('OAuth client not found');
  }
}
