import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Alert, type AlertStatus } from './alert.entity';
import { Meter } from '../meters/meter.entity';
import { getMeterStatus, getOfflineTriggeredAt, OFFLINE_THRESHOLD_MINUTES } from '../meters/meter-status.util';
import { getScopedSiteIds, hasSiteAccess, type AccessScope } from '../auth/access-scope';

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

  private async canAccessAlert(alert: Alert, scope: AccessScope) {
    if (hasSiteAccess(scope, alert.buildingId)) {
      return true;
    }

    if (!alert.meterId) {
      return false;
    }

    const meter = await this.meterRepo.findOne({ where: { id: alert.meterId } });
    return hasSiteAccess(scope, meter?.buildingId);
  }

  async findAll(scope: AccessScope, filters: {
    status?: AlertStatus;
    type?: string;
    meterId?: string;
    buildingId?: string;
    limit?: number;
  } = {}) {
    const qb = this.alertRepo.createQueryBuilder('alert')
      .orderBy('alert.triggeredAt', 'DESC');
    const scopedSiteIds = getScopedSiteIds(scope);

    if (scopedSiteIds) {
      qb.andWhere('alert.buildingId IN (:...siteIds)', { siteIds: scopedSiteIds });
    }

    if (filters.status) qb.andWhere('alert.status = :status', { status: filters.status });
    if (filters.type) qb.andWhere('alert.type = :type', { type: filters.type });
    if (filters.meterId) qb.andWhere('alert.meterId = :meterId', { meterId: filters.meterId });
    if (filters.buildingId) qb.andWhere('alert.buildingId = :buildingId', { buildingId: filters.buildingId });

    qb.take(Math.min(Math.max(filters.limit ?? 50, 1), 200));
    return qb.getMany();
  }

  async findOne(id: string, scope: AccessScope) {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) return null;

    return (await this.canAccessAlert(alert, scope)) ? alert : null;
  }

  async acknowledge(id: string, scope: AccessScope) {
    const alert = await this.findOne(id, scope);
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

  private syncMeterAlertState(
    meter: Meter,
    existingAlert: Alert | undefined,
    meterUpdates: Meter[],
    alertCreates: Alert[],
    alertUpdates: Alert[],
  ) {
    const computedStatus = getMeterStatus(meter.lastReadingAt);

    if (meter.status !== computedStatus) {
      meter.status = computedStatus;
      meterUpdates.push(meter);
    }

    if (computedStatus === 'offline') {
      if (!existingAlert && meter.lastReadingAt) {
        alertCreates.push(this.createOfflineAlert(meter));
      }

      return;
    }

    if (existingAlert) {
      alertUpdates.push(this.resolveOfflineAlert(existingAlert));
    }
  }

  async scanOfflineMeters(scope: AccessScope) {
    const scopedSiteIds = getScopedSiteIds(scope);
    const meterWhere = scopedSiteIds ? { buildingId: In(scopedSiteIds) } : {};
    const openAlertWhere = {
      ...(scopedSiteIds ? { buildingId: In(scopedSiteIds) } : {}),
      type: OFFLINE_ALERT_TYPE,
      status: In(OPEN_ALERT_STATUSES),
    };
    const [meters, openAlerts] = await Promise.all([
      this.meterRepo.find({ where: meterWhere, order: { id: 'ASC' } }),
      this.alertRepo.find({ where: openAlertWhere }),
    ]);

    const openAlertByMeterId = this.buildOpenAlertByMeterId(openAlerts);

    const meterUpdates: Meter[] = [];
    const alertCreates: Alert[] = [];
    const alertUpdates: Alert[] = [];

    for (const meter of meters) {
      const existingAlert = openAlertByMeterId.get(meter.id);
      this.syncMeterAlertState(
        meter,
        existingAlert,
        meterUpdates,
        alertCreates,
        alertUpdates,
      );
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

    const activeCount = await this.alertRepo.count({ where: openAlertWhere });

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
