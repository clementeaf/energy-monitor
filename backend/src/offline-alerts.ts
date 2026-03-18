import { Client } from 'pg';

/**
 * Lambda invoked every 5 minutes by EventBridge.
 * Detects meters with no readings in the last 15 minutes and inserts METER_OFFLINE alerts.
 * Skips meters that already have an unresolved METER_OFFLINE alert in the last hour.
 */

const OFFLINE_THRESHOLD_MINUTES = 15;
const DEDUP_WINDOW_MINUTES = 60;

export const handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    // Find meters whose latest reading is older than the threshold
    const { rows: offlineMeters } = await client.query<{ meter_id: string; last_ts: Date }>(`
      SELECT s.meter_id, mr.last_ts
      FROM store s
      LEFT JOIN LATERAL (
        SELECT timestamp AS last_ts
        FROM meter_readings
        WHERE meter_id = s.meter_id
        ORDER BY timestamp DESC
        LIMIT 1
      ) mr ON true
      WHERE mr.last_ts IS NULL
         OR mr.last_ts < NOW() - INTERVAL '${OFFLINE_THRESHOLD_MINUTES} minutes'
    `);

    if (offlineMeters.length === 0) {
      return { statusCode: 200, body: { inserted: 0, checked: 0 } };
    }

    // Filter out meters that already have a recent METER_OFFLINE alert (dedup)
    const meterIds = offlineMeters.map((m) => m.meter_id);
    const { rows: recentAlerts } = await client.query<{ meter_id: string }>(
      `SELECT DISTINCT meter_id FROM alerts
       WHERE alert_type = 'METER_OFFLINE'
         AND created_at > NOW() - INTERVAL '${DEDUP_WINDOW_MINUTES} minutes'
         AND meter_id = ANY($1)`,
      [meterIds],
    );
    const recentSet = new Set(recentAlerts.map((r) => r.meter_id));
    const toAlert = offlineMeters.filter((m) => !recentSet.has(m.meter_id));

    if (toAlert.length === 0) {
      return { statusCode: 200, body: { inserted: 0, checked: offlineMeters.length, deduped: offlineMeters.length } };
    }

    // Batch insert alerts
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const m of toAlert) {
      const mins = m.last_ts
        ? Math.round((Date.now() - new Date(m.last_ts).getTime()) / 60000)
        : null;
      const message = m.last_ts
        ? `Sin lecturas hace ${mins} minutos (última: ${new Date(m.last_ts).toISOString()})`
        : 'Sin lecturas registradas';

      placeholders.push(`($${idx++}, NOW(), $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(m.meter_id, 'METER_OFFLINE', 'warning', 'timestamp', message);
    }

    await client.query(
      `INSERT INTO alerts (meter_id, timestamp, alert_type, severity, field, message)
       VALUES ${placeholders.join(', ')}`,
      values,
    );

    return {
      statusCode: 200,
      body: {
        inserted: toAlert.length,
        checked: offlineMeters.length,
        deduped: recentSet.size,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('offlineAlerts error:', message);
    return { statusCode: 500, body: { error: message } };
  } finally {
    await client.end();
  }
};
