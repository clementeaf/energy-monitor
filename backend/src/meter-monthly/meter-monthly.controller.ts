import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { MeterMonthlyService } from './meter-monthly.service';

@Public()
@Controller('meter-monthly')
export class MeterMonthlyController {
  constructor(private readonly meterMonthlyService: MeterMonthlyService) {}

  @Get()
  async findAll() {
    return this.meterMonthlyService.findAll();
  }

  @Get(':meterId')
  async findByMeterId(@Param('meterId') meterId: string) {
    const results = await this.meterMonthlyService.findByMeterId(meterId);
    if (!results.length) {
      throw new NotFoundException(`No monthly data for meter "${meterId}"`);
    }
    return results;
  }
}
