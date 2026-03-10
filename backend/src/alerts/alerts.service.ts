import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alert, type AlertStatus } from './alert.entity';
import { Meter } from '../meters/meter.entity';
import { getMeterStatus, getOfflineTriggeredAt, OFFLINE_THRESHOLD_MINUTES } from '../meters/meter-status.util';

const OFFLINE_ALERT_TYPE = 'METER_OFFLINE';
const OPEN_ALERT_STATUSES: AlertStatus[] = ['active', 'acknowledged'];

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(Meter)
    private readonly meterRepo: Repository<Meter>,
  ) {}

  async findAll(filters: {
    status?: AlertStatus;
    type?: string;
    meterId?: string;
    buildingId?: string;
    limit?: number;
  } = {}) {
    const qb = this.alertRepo.createQueryBuilder('alert')
      .orderBy('alert.triggeredAt', 'DESC');

    if (filters.status) qb.andWhere('alert.status = :status', { status: filters.status });
    if (filters.type) qb.andWhere('alert.type = :type', { type: filters.type });
    if (filters.meterId) qb.andWhere('alert.meterId = :meterId', { meterId: filters.meterId });
    if (filters.buildingId) qb.andWhere('alert.buildingId = :buildingId', { buildingId: filters.buildingId });

    qb.take(Math.min(Math.max(filters.limit ?? 50, 1), 200));
    return qb.getMany();
  }

  async findOne(id: string) {
    return this.alertRepo.findOne({ where: { id } });
  }

  async acknowledge(id: string) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) return null;
    if (alert.status === 'resolved') return alert;

    alert.status = 'acknowledged';
    alert.acknowledgedAt ??= new Date();
    return this.alertRepo.save(alert);
  }

  private buildOpenAlertByMeterId(openAlerts: Alert[]) {
    const openAlertEntries: Array<[string, Alert]> = [];
    for (const alert of openAlerts) {
      if (alert.meterId) {
        openAlertEntries.push([alert.meterId, alert]);
      }
    }
    return new Map(openAlertEntries);
  }

  private createOfflineAlert(meter: Meter) {
    const lastReadingAt = new Date(meter.lastReadingAt ?? new Date());

    return this.alertRepo.create({
      type: OFFLINE_ALERT_TYPE,
      severity: 'high',
      status: 'active',
      meterId: meter.id,
      buildingId: meter.buildingId,
      title: `Medidor ${meter.id} offline`,
      message: `El medidor ${meter.id} del edificio ${meter.buildingId} no reporta lecturas desde ${lastReadingAt.toISOString()}.`,
      triggeredAt: getOfflineTriggeredAt(lastReadingAt),
      acknowledgedAt: null,
      resolvedAt: null,
      metadata: {
        source: 'offline-monitor',
        model: meter.model,
        busId: meter.busId,
        phaseType: meter.phaseType,
        lastReadingAt: lastReadingAt.toISOString(),
        offlineThresholdMinutes: OFFLINE_THRESHOLD_MINUTES,
      },
    });
  }

  private resolveOfflineAlert(alert: Alert) {
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.metadata = {
      ...alert.metadata,
      resolvedBy: 'offline-monitor',
      resolvedAt: alert.resolvedAt.toISOString(),
    };
    return alert;
  }

  async scanOfflineMeters() {
    const [meters, openAlerts] = await Promise.all([
      this.meterRepo.find({ order: { id: 'ASC' } }),
      this.alertRepo.find({
        where: {
          type: OFFLINE_ALERT_TYPE,
          status: In(OPEN_ALERT_STATUSES),
        },
      }),
    ]);

    const openAlertByMeterId = this.buildOpenAlertByMeterId(openAlerts);

    const meterUpdates: Meter[] = [];
    const alertCreates: Alert[] = [];
    const alertUpdates: Alert[] = [];

    for (const meter of meters) {
      const computedStatus = getMeterStatus(meter.lastReadingAt);
      const existingAlert = openAlertByMeterId.get(meter.id);

      if (meter.status !== computedStatus) {
        meter.status = computedStatus;
        meterUpdates.push(meter);
      }

      if (computedStatus === 'offline') {
        if (!existingAlert && meter.lastReadingAt) {
          alertCreates.push(this.createOfflineAlert(meter));
        }

        continue;
      }

      if (existingAlert) {
        alertUpdates.push(this.resolveOfflineAlert(existingAlert));
      }
    }

    if (meterUpdates.length > 0) {
      await this.meterRepo.save(meterUpdates);
    }
    if (alertCreates.length > 0) {
      await this.alertRepo.save(alertCreates);
    }
    if (alertUpdates.length > 0) {
      await this.alertRepo.save(alertUpdates);
    }

    const activeCount = await this.alertRepo.count({
      where: {
        type: OFFLINE_ALERT_TYPE,
        status: In(OPEN_ALERT_STATUSES),
      },
    });

    const summary = {
      scannedMeters: meters.length,
      createdAlerts: alertCreates.length,
      resolvedAlerts: alertUpdates.length,
      activeOfflineAlerts: activeCount,
      scannedAt: new Date().toISOString(),
    };

    if (alertCreates.length > 0 || alertUpdates.length > 0) {
      this.logger.log(`Offline alert sync result: ${JSON.stringify(summary)}`);
    }

    return summary;
  }
}
