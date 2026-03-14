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
      `SELECT DISTINCT ON (r.meter_id)
         r.meter_id        AS "meterId",
         COALESCE(s.store_name, 'Por censar') AS "storeName",
         r.power_kw        AS "powerKw",
         r.voltage_l1      AS "voltageL1",
         r.current_l1      AS "currentL1",
         r.power_factor    AS "powerFactor",
         r.timestamp        AS "timestamp"
       FROM meter_readings r
       JOIN meter_monthly_billing b ON b.meter_id = r.meter_id AND b.building_name = $1
       LEFT JOIN store s ON s.meter_id = r.meter_id
       ORDER BY r.meter_id, r.timestamp DESC`,
      [buildingName],
    );

    return rows.map((r: Record<string, unknown>) => ({
      meterId: r.meterId as string,
      storeName: r.storeName as string,
      powerKw: r.powerKw !== null ? parseFloat(String(r.powerKw)) : null,
      voltageL1: r.voltageL1 !== null ? parseFloat(String(r.voltageL1)) : null,
      currentL1: r.currentL1 !== null ? parseFloat(String(r.currentL1)) : null,
      powerFactor: r.powerFactor !== null ? parseFloat(String(r.powerFactor)) : null,
      timestamp: String(r.timestamp),
    }));
  }
}
