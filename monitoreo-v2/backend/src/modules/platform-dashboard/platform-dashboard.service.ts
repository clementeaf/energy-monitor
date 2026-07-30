import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface PlatformKpis {
  tenants: number;
  buildings: number;
  meters: number;
  readings: number;
  activeAlerts: number;
  onlineMeters: number;
  offlineMeters: number;
  tenantSummaries: TenantSummary[];
}

export interface TenantSummary {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  buildings: number;
  meters: number;
  activeAlerts: number;
}

@Injectable()
export class PlatformDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  async getKpis(): Promise<PlatformKpis> {
    const [counts] = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM tenants WHERE is_active = true AND slug != 'globe-power')::int AS tenants,
        (SELECT COUNT(*) FROM buildings WHERE is_active = true)::int AS buildings,
        (SELECT COUNT(*) FROM meters WHERE is_active = true)::int AS meters,
        (SELECT reltuples::bigint FROM pg_class WHERE relname = 'readings')::int AS readings,
        (SELECT COUNT(*) FROM alerts WHERE status = 'active')::int AS active_alerts
    `);

    const [connectivity] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE ms.last_reading_at > NOW() - INTERVAL '30 minutes')::int AS online,
        COUNT(*) FILTER (WHERE ms.last_reading_at IS NULL OR ms.last_reading_at <= NOW() - INTERVAL '30 minutes')::int AS offline
      FROM meters m
      LEFT JOIN meter_reading_status ms ON ms.meter_id = m.id
      WHERE m.is_active = true
    `);

    const tenantSummaries: TenantSummary[] = await this.dataSource.query(`
      SELECT
        t.id AS "tenantId",
        t.name AS "tenantName",
        t.slug AS "tenantSlug",
        (SELECT COUNT(*) FROM buildings b WHERE b.tenant_id = t.id AND b.is_active = true)::int AS buildings,
        (SELECT COUNT(*) FROM meters m WHERE m.tenant_id = t.id AND m.is_active = true)::int AS meters,
        (SELECT COUNT(*) FROM alerts a WHERE a.tenant_id = t.id AND a.status = 'active')::int AS "activeAlerts"
      FROM tenants t
      WHERE t.is_active = true AND t.slug != 'globe-power'
      ORDER BY t.name
    `);

    return {
      tenants: counts.tenants,
      buildings: counts.buildings,
      meters: counts.meters,
      readings: counts.readings,
      activeAlerts: counts.active_alerts,
      onlineMeters: connectivity.online,
      offlineMeters: connectivity.offline,
      tenantSummaries,
    };
  }
}
