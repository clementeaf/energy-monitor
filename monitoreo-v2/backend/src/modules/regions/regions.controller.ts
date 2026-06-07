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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('Regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @RequirePermission('admin_buildings', 'read')
  @ApiOperation({ summary: 'List regions for tenant' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.regionsService.findAll(user.tenantId);
  }

  @Post()
  @RequirePermission('admin_buildings', 'create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create region' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRegionDto) {
    return this.regionsService.create(user.tenantId, dto);
  }

  @Patch(':id')
  @RequirePermission('admin_buildings', 'update')
  @ApiOperation({ summary: 'Update region' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateRegionDto,
  ) {
    const updated = await this.regionsService.update(id, user.tenantId, dto);
    if (!updated) throw new NotFoundException('Region not found');
    return updated;
  }

  @Delete(':id')
  @RequirePermission('admin_buildings', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete region' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    const ok = await this.regionsService.remove(id, user.tenantId);
    if (!ok) throw new NotFoundException('Region not found');
  }
}
