import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IotDevicesService } from './iot-devices.service';
import { RequireAnyPermission } from '../../common/guards/permissions.guard';
import { IsUUID } from 'class-validator';

class AssignDto {
  @IsUUID()
  meterId!: string;
}

@ApiTags('IoT Devices')
@Controller('iot-devices')
export class IotDevicesController {
  constructor(private readonly service: IotDevicesService) {}

  @Get()
  @ApiOperation({ summary: 'List all discovered IoT devices' })
  @ApiResponse({ status: 200, description: 'List of IoT devices' })
  @RequireAnyPermission('admin_meters:read', 'admin_integrations:read')
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get IoT device by ID' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @RequireAnyPermission('admin_meters:read', 'admin_integrations:read')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const device = await this.service.findOne(id);
    if (!device) throw new NotFoundException('IoT device not found');
    return device;
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign IoT device to a meter' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @RequireAnyPermission('admin_meters:update', 'admin_integrations:update')
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDto,
  ) {
    const device = await this.service.assign(id, dto.meterId);
    if (!device) throw new NotFoundException('IoT device or meter not found');
    return device;
  }

  @Patch(':id/unassign')
  @ApiOperation({ summary: 'Unassign IoT device from its meter' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @RequireAnyPermission('admin_meters:update', 'admin_integrations:update')
  async unassign(@Param('id', ParseUUIDPipe) id: string) {
    const device = await this.service.unassign(id);
    if (!device) throw new NotFoundException('IoT device not found');
    return device;
  }
}
