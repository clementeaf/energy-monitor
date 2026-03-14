import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { enforceRange } from '../common/range-guard';
import { MeterReadingsService } from './meter-readings.service';

@Public()
@Controller('meter-readings')
export class MeterReadingsController {
  constructor(private readonly meterReadingsService: MeterReadingsService) {}

  @Get(':meterId')
  async findByMeter(
    @Param('meterId') meterId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const range = enforceRange(from, to);
    const results = await this.meterReadingsService.findByMeter(
      meterId,
      new Date(range.from),
      new Date(range.to),
      limit ? parseInt(limit, 10) : undefined,
    );
    if (!results.length) {
      throw new NotFoundException(`No readings for meter "${meterId}" in range`);
    }
    return results;
  }
}
