import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { MetersService } from './meters.service';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const meter = await this.metersService.findOne(id);
    if (!meter) throw new NotFoundException();
    return meter;
  }

  @Get(':id/readings')
  findReadings(
    @Param('id') id: string,
    @Query('resolution') resolution?: 'raw' | 'hourly' | 'daily',
  ) {
    return this.metersService.findReadings(id, resolution ?? 'hourly');
  }
}
