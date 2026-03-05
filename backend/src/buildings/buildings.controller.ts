import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { BuildingsService } from './buildings.service';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  findAll() {
    return this.buildingsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const building = await this.buildingsService.findOne(id);
    if (!building) throw new NotFoundException();
    return building;
  }

  @Get(':id/meters')
  findMeters(@Param('id') id: string) {
    return this.buildingsService.findMeters(id);
  }

  @Get(':id/consumption')
  findConsumption(
    @Param('id') id: string,
    @Query('resolution') resolution?: 'hourly' | 'daily',
  ) {
    return this.buildingsService.findConsumption(id, resolution ?? 'hourly');
  }
}
