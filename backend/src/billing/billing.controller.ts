import { Controller, Get, Param, Query, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { BillingService } from './billing.service';
import type { Response } from 'express';

@Public()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('pdf')
  async getPdf(
    @Query('storeName') storeName: string,
    @Query('buildingName') buildingName: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    if (!storeName || !buildingName || !month) {
      throw new NotFoundException('storeName, buildingName, and month are required');
    }

    try {
      const { pdf, filename } = await this.billingService.generatePdf(storeName, buildingName, month);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdf.length,
      });
      res.send(pdf);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'PDF generation failed';
      if (message.includes('No meters found') || message.includes('No billing data')) {
        throw new NotFoundException(message);
      }
      throw new InternalServerErrorException(message);
    }
  }

  @Get(':buildingName')
  async findByBuilding(@Param('buildingName') buildingName: string) {
    const results = await this.billingService.findByBuilding(buildingName);
    if (!results.length) {
      throw new NotFoundException(`No billing data for "${buildingName}"`);
    }
    return results;
  }
}
