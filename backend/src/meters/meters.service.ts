import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MeterListItem {
  meterId: string;
  storeName: string;
  storeType: string;
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
      `SELECT DISTINCT
         b.meter_id   AS "meterId",
         s.store_name AS "storeName",
         st.name      AS "storeType"
       FROM meter_monthly_billing b
       LEFT JOIN store s ON s.meter_id = b.meter_id
       LEFT JOIN store_type st ON st.id = s.store_type_id
       WHERE b.building_name = $1
       ORDER BY b.meter_id`,
      [buildingName],
    );

    return rows.map((r: Record<string, string | null>) => ({
      meterId: r.meterId,
      storeName: r.storeName ?? 'Por censar',
      storeType: r.storeType ?? '',
    }));
  }

  async findLatestByBuilding(buildingName: string): Promise<MeterLatestReading[]> {
    const rows = await this.dataSource.query(
      `SELECT
         m.meter_id        AS "meterId",
         COALESCE(s.store_name, 'Por censar') AS "storeName",
         $1                AS "buildingName",
         r.power_kw        AS "powerKw",
         r.voltage_l1      AS "voltageL1",
         r.current_l1      AS "currentL1",
         r.power_factor    AS "powerFactor",
         r.timestamp        AS "timestamp"
       FROM (
         SELECT DISTINCT meter_id FROM meter_monthly_billing WHERE building_name = $1
       ) m
       LEFT JOIN LATERAL (
         SELECT power_kw, voltage_l1, current_l1, power_factor, timestamp
         FROM meter_readings
         WHERE meter_id = m.meter_id
         ORDER BY timestamp DESC
         LIMIT 1
       ) r ON true
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
