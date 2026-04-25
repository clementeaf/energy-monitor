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
        (SELECT COUNT(*) FROM tenants WHERE is_active = true)::int AS tenants,
        (SELECT COUNT(*) FROM buildings WHERE is_active = true)::int AS buildings,
        (SELECT COUNT(*) FROM meters WHERE is_active = true)::int AS meters,
        (SELECT COUNT(*) FROM readings)::int AS readings,
        (SELECT COUNT(*) FROM alerts WHERE status = 'active')::int AS active_alerts
    `);

    // Online/offline: meter has reading in last 30 min = online
    const [connectivity] = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE lr.timestamp > NOW() - INTERVAL '30 minutes')::int AS online,
        COUNT(*) FILTER (WHERE lr.timestamp IS NULL OR lr.timestamp <= NOW() - INTERVAL '30 minutes')::int AS offline
      FROM meters m
      LEFT JOIN LATERAL (
        SELECT r.timestamp FROM readings r
        WHERE r.meter_id = m.id
        ORDER BY r.timestamp DESC LIMIT 1
      ) lr ON true
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
      WHERE t.is_active = true
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
