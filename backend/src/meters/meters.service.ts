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
      `SELECT
         b.meter_id   AS "meterId",
         COALESCE(s.store_name, 'Por censar') AS "storeName",
         COALESCE(st.name, '')  AS "storeType",
         CASE WHEN s.is_three_phase THEN 'Trifásico' ELSE 'Monofásico' END AS "phaseType"
       FROM (
         SELECT DISTINCT meter_id FROM meter_monthly_billing WHERE building_name = $1
       ) b
       LEFT JOIN store s ON s.meter_id = b.meter_id
       LEFT JOIN store_type st ON st.id = s.store_type_id
       ORDER BY b.meter_id`,
      [buildingName],
    );

    return rows.map((r: Record<string, string | null>) => ({
      meterId: r.meterId!,
      storeName: r.storeName ?? 'Por censar',
      storeType: r.storeType ?? '',
      phaseType: r.phaseType ?? 'Monofásico',
    }));
  }

  async findMeterContext(meterId: string): Promise<{ storeName: string; buildingName: string | null }> {
    const rows = await this.dataSource.query(
      `SELECT
         COALESCE(s.store_name, 'Sin información') AS "storeName",
         mmb.building_name AS "buildingName"
       FROM store s
       LEFT JOIN meter_monthly_billing mmb ON mmb.meter_id = s.meter_id
       WHERE s.meter_id = $1
       LIMIT 1`,
      [meterId],
    );
    return rows.length > 0
      ? { storeName: rows[0].storeName, buildingName: rows[0].buildingName ?? null }
      : { storeName: 'Sin información', buildingName: null };
  }

  async findLatestByBuilding(buildingName: string): Promise<MeterLatestReading[]> {
    const rows = await this.dataSource.query(
      `SELECT * FROM fn_latest_readings_by_building($1)`,
      [buildingName],
    );

    return rows.map((r: Record<string, unknown>) => ({
      meterId: r.meter_id as string,
      storeName: r.store_name as string,
      buildingName: r.building_name as string,
      powerKw: r.power_kw !== null ? parseFloat(String(r.power_kw)) : null,
      voltageL1: r.voltage_l1 !== null ? parseFloat(String(r.voltage_l1)) : null,
      currentL1: r.current_l1 !== null ? parseFloat(String(r.current_l1)) : null,
      powerFactor: r.power_factor !== null ? parseFloat(String(r.power_factor)) : null,
      timestamp: String(r.ts),
    }));
  }
}
