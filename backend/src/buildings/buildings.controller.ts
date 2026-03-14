import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { BuildingsService } from './buildings.service';

@Public()
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  async findAll() {
    return this.buildingsService.findAll();
  }

  @Get(':name')
  async findByName(@Param('name') name: string) {
    const results = await this.buildingsService.findByName(name);
    if (!results.length) {
      throw new NotFoundException(`Building "${name}" not found`);
    }
    return results;
  }
}
