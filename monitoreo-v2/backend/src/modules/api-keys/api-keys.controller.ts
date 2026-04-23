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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @RequirePermission('api_keys', 'read')
  @ApiOperation({ summary: 'List all API keys' })
  @ApiResponse({ status: 200, description: 'API keys list returned' })
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.apiKeysService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('api_keys', 'read')
  @ApiOperation({ summary: 'Get an API key by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'API key returned' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const row = await this.apiKeysService.findOne(id, user.tenantId);
    if (!row) throw new NotFoundException('API key not found');
    return row;
  }

  /**
   * Create a new API key. Returns the plain key ONCE in the response.
   * The key cannot be retrieved again — store it securely.
   */
  @Post()
  @RequirePermission('api_keys', 'create')
  @ApiOperation({ summary: 'Create an API key (plain key returned once)' })
  @ApiResponse({ status: 201, description: 'API key created with plain key' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: JwtPayload) {
    const { plainKey, apiKey } = await this.apiKeysService.create(
      user.tenantId,
      dto,
      user.sub,
    );
    return { key: plainKey, apiKey };
  }

  @Patch(':id')
  @RequirePermission('api_keys', 'update')
  @ApiOperation({ summary: 'Update an API key' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApiKeyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const row = await this.apiKeysService.update(id, user.tenantId, dto);
    if (!row) throw new NotFoundException('API key not found');
    return row;
  }

  /** Regenerate the key. Returns the new plain key ONCE. */
  @Post(':id/rotate')
  @RequirePermission('api_keys', 'update')
  @ApiOperation({ summary: 'Rotate an API key (new plain key returned once)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Key rotated with new plain key' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rotate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const { plainKey, apiKey } = await this.apiKeysService.rotateKey(id, user.tenantId);
    return { key: plainKey, apiKey };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('api_keys', 'update')
  @ApiOperation({ summary: 'Delete an API key' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'API key deleted' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.apiKeysService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('API key not found');
  }
}
