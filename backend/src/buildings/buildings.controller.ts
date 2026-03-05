import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
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

  @Get(':id/locals')
  findLocals(@Param('id') id: string) {
    return this.buildingsService.findLocals(id);
  }

  @Get(':id/consumption')
  findConsumption(@Param('id') id: string) {
    return this.buildingsService.findConsumption(id);
  }
}
