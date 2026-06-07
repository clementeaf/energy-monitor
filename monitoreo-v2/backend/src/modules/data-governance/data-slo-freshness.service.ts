import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenants/entities/tenant.entity';
import { DataSloBreach } from '../platform/entities/data-slo-breach.entity';
import { MeterReadingStatusService } from '../ingest/meter-reading-status.service';
import { getStaleThresholdHours } from '../../lib/tenant-settings';

/**
 * Records SLO breaches when buildings have stale meters (GAP-168).
 */
@Injectable()
export class DataSloFreshnessService {
  private readonly logger = new Logger(DataSloFreshnessService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(DataSloBreach)
    private readonly breachRepo: Repository<DataSloBreach>,
    private readonly meterStatusService: MeterReadingStatusService,
  ) {}

  /**
   * Checks freshness SLO per building daily after ingest status is updated.
   */
  @Cron('0 15 4 * * *', { name: 'data-slo-freshness' })
  async runFreshnessCheck(): Promise<number> {
    const tenants = await this.tenantRepo.find({ where: { isActive: true } });
    let breaches = 0;

    for (const tenant of tenants) {
      const thresholdHours = getStaleThresholdHours(tenant.settings);
      const staleMeters = await this.meterStatusService.getStaleMeters(tenant.id, thresholdHours);

      const byBuilding = new Map<string, number>();
      for (const meter of staleMeters) {
        const count = byBuilding.get(meter.building_id) ?? 0;
        byBuilding.set(meter.building_id, count + 1);
      }

      for (const [buildingId, staleCount] of byBuilding) {
        if (staleCount <= 0) continue;

        await this.breachRepo.save(
          this.breachRepo.create({
            tenantId: tenant.id,
            sloType: 'freshness',
            detail: {
              buildingId,
              staleMeterCount: staleCount,
              thresholdHours,
            },
          }),
        );
        breaches += 1;
      }
    }

    if (breaches > 0) {
      this.logger.log(`Freshness SLO: ${breaches} building breaches recorded`);
    }
    return breaches;
  }
}
