import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { BillingService } from './billing.service';

@Public()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get(':buildingName')
  async findByBuilding(@Param('buildingName') buildingName: string) {
    const results = await this.billingService.findByBuilding(buildingName);
    if (!results.length) {
      throw new NotFoundException(`No billing data for "${buildingName}"`);
    }
    return results;
  }
}
