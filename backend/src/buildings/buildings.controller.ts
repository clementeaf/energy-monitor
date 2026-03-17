import { Controller, Get, Post, Patch, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

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

  @Post()
  async create(@Body() dto: CreateBuildingDto) {
    return this.buildingsService.create(dto);
  }

  @Patch(':name')
  async update(@Param('name') name: string, @Body() dto: UpdateBuildingDto) {
    const existing = await this.buildingsService.findByName(name);
    if (!existing.length) {
      throw new NotFoundException(`Building "${name}" not found`);
    }
    await this.buildingsService.update(name, dto);
    return { success: true };
  }

  @Delete(':name')
  async remove(@Param('name') name: string) {
    const existing = await this.buildingsService.findByName(name);
    if (!existing.length) {
      throw new NotFoundException(`Building "${name}" not found`);
    }
    await this.buildingsService.remove(name);
    return { success: true };
  }
}
