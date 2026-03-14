import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MetersService } from './meters.service';

@Public()
@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get('building/:buildingName')
  async findByBuilding(@Param('buildingName') buildingName: string) {
    const results = await this.metersService.findByBuilding(buildingName);
    if (!results.length) {
      throw new NotFoundException(`No meters for "${buildingName}"`);
    }
    return results;
  }

  @Get('building/:buildingName/latest')
  async findLatestByBuilding(@Param('buildingName') buildingName: string) {
    const results = await this.metersService.findLatestByBuilding(buildingName);
    if (!results.length) {
      throw new NotFoundException(`No latest readings for "${buildingName}"`);
    }
    return results;
  }
}
