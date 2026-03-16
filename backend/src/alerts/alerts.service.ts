import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AlertsService {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async findAll(filters?: { severity?: string; meterId?: string }) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters?.severity) {
      conditions.push(`a.severity = $${idx++}`);
      params.push(filters.severity);
    }
    if (filters?.meterId) {
      conditions.push(`a.meter_id = $${idx++}`);
      params.push(filters.meterId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await this.dataSource.query(`
      SELECT
        a.id,
        a.meter_id       AS "meterId",
        a.timestamp,
        a.alert_type      AS "alertType",
        a.severity,
        a.field,
        a.value::float,
        a.threshold::float,
        a.message,
        a.created_at       AS "createdAt",
        COALESCE(s.store_name, '') AS "storeName",
        CASE
          WHEN a.meter_id LIKE 'MG%'   THEN 'Mallplaza Gestión'
          WHEN a.meter_id LIKE 'MM%'   THEN 'Mallplaza Marketing'
          WHEN a.meter_id LIKE 'OT%'   THEN 'Oficina Tres'
          WHEN a.meter_id LIKE 'SC52%' THEN 'Strip Center 52'
          WHEN a.meter_id LIKE 'SC53%' THEN 'Strip Center 53'
          ELSE 'Desconocido'
        END AS "buildingName"
      FROM alerts a
      LEFT JOIN store s ON s.meter_id = a.meter_id
      ${where}
      ORDER BY a.timestamp DESC
      LIMIT 500
    `, params);

    return rows;
  }
}
