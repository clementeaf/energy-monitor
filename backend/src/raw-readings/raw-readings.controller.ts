import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { enforceRange } from '../common/range-guard';
import { RawReadingsService } from './raw-readings.service';

@Public()
@Controller('raw-readings')
export class RawReadingsController {
  constructor(private readonly rawReadingsService: RawReadingsService) {}

  @Get(':meterId')
  async findByMeter(
    @Param('meterId') meterId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const range = enforceRange(from, to);
    const results = await this.rawReadingsService.findByMeter(
      meterId,
      new Date(range.from),
      new Date(range.to),
      limit ? parseInt(limit, 10) : undefined,
    );
    if (!results.length) {
      throw new NotFoundException(`No raw readings for meter "${meterId}" in range`);
    }
    return results;
  }
}
