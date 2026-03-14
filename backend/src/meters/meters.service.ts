import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface MeterListItem {
  meterId: string;
  storeName: string;
  storeType: string;
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
}
