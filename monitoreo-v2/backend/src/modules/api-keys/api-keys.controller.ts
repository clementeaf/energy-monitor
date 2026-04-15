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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/guards/permissions.guard';

@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  @RequirePermission('api_keys', 'read')
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.apiKeysService.findAll(user.tenantId);
  }

  @Get(':id')
  @RequirePermission('api_keys', 'read')
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
  async rotate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const { plainKey, apiKey } = await this.apiKeysService.rotateKey(id, user.tenantId);
    return { key: plainKey, apiKey };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('api_keys', 'update')
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const ok = await this.apiKeysService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('API key not found');
  }
}
