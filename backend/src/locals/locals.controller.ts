import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { LocalsService } from './locals.service';

@Controller('locals')
export class LocalsController {
  constructor(private readonly localsService: LocalsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const local = await this.localsService.findOne(id);
    if (!local) throw new NotFoundException();
    return local;
  }

  @Get(':id/consumption')
  findConsumption(@Param('id') id: string) {
    return this.localsService.findConsumption(id);
  }
}
