import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MeterListItem {
  meterId: string;
  storeName: string;
  storeType: string;
  phaseType: string;
}

export interface MeterLatestReading {
  meterId: string;
  storeName: string;
  buildingName: string;
  powerKw: number | null;
  voltageL1: number | null;
  currentL1: number | null;
  powerFactor: number | null;
  timestamp: string;
}

@Injectable()
export class MetersService {
  constructor(private readonly dataSource: DataSource) {}

  async findByBuilding(buildingName: string): Promise<MeterListItem[]> {
    const rows = await this.dataSource.query(
      `WITH building_meters AS (
         SELECT DISTINCT meter_id FROM meter_monthly_billing WHERE building_name = $1
       ),
       phase_check AS (
         SELECT bm.meter_id
         FROM building_meters bm,
         LATERAL (
           SELECT 1 FROM meter_readings
           WHERE meter_id = bm.meter_id AND voltage_l2 IS NOT NULL AND voltage_l2 != 0
           LIMIT 1
         ) pc
       )
       SELECT
         b.meter_id   AS "meterId",
         s.store_name AS "storeName",
         st.name      AS "storeType",
         CASE WHEN pc.meter_id IS NOT NULL THEN 'Trifásico' ELSE 'Monofásico' END AS "phaseType"
       FROM building_meters b
       LEFT JOIN store s ON s.meter_id = b.meter_id
       LEFT JOIN store_type st ON st.id = s.store_type_id
       LEFT JOIN phase_check pc ON pc.meter_id = b.meter_id
       ORDER BY b.meter_id`,
      [buildingName],
    );

    return rows.map((r: Record<string, string | null>) => ({
      meterId: r.meterId,
      storeName: r.storeName ?? 'Por censar',
      storeType: r.storeType ?? '',
      phaseType: r.phaseType ?? 'Monofásico',
    }));
  }

  async findStoreName(meterId: string): Promise<string> {
    const rows = await this.dataSource.query(
      `SELECT COALESCE(s.store_name, 'Sin información') AS "storeName"
       FROM store s WHERE s.meter_id = $1 LIMIT 1`,
      [meterId],
    );
    return rows.length > 0 ? rows[0].storeName : 'Sin información';
  }

  async findLatestByBuilding(buildingName: string): Promise<MeterLatestReading[]> {
    const rows = await this.dataSource.query(
      `WITH building_meters AS (
         SELECT DISTINCT meter_id FROM meter_monthly_billing WHERE building_name = $1
       ),
       latest AS (
         SELECT bm.meter_id, r.power_kw, r.voltage_l1, r.current_l1, r.power_factor, r.timestamp
         FROM building_meters bm,
         LATERAL (
           SELECT power_kw, voltage_l1, current_l1, power_factor, timestamp
           FROM meter_readings
           WHERE meter_id = bm.meter_id
           ORDER BY timestamp DESC
           LIMIT 1
         ) r
       )
       SELECT
         m.meter_id        AS "meterId",
         COALESCE(s.store_name, 'Por censar') AS "storeName",
         $1                AS "buildingName",
         l.power_kw        AS "powerKw",
         l.voltage_l1      AS "voltageL1",
         l.current_l1      AS "currentL1",
         l.power_factor    AS "powerFactor",
         l.timestamp        AS "timestamp"
       FROM building_meters m
       LEFT JOIN latest l ON l.meter_id = m.meter_id
       LEFT JOIN store s ON s.meter_id = m.meter_id
       ORDER BY m.meter_id`,
      [buildingName],
    );

    return rows.map((r: Record<string, unknown>) => ({
      meterId: r.meterId as string,
      storeName: r.storeName as string,
      buildingName: r.buildingName as string,
      powerKw: r.powerKw !== null ? parseFloat(String(r.powerKw)) : null,
      voltageL1: r.voltageL1 !== null ? parseFloat(String(r.voltageL1)) : null,
      currentL1: r.currentL1 !== null ? parseFloat(String(r.currentL1)) : null,
      powerFactor: r.powerFactor !== null ? parseFloat(String(r.powerFactor)) : null,
      timestamp: String(r.timestamp),
    }));
  }
}
