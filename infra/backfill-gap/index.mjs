import pg from 'pg';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
const { Client } = pg;

/**
 * One-shot fix: delete inflated synthetic readings from Mar 6 onwards,
 * then re-generate them with correct magnitudes.
 */
export const handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: getPgSslOptionsForRds(),
  });

  await client.connect();

  try {
    // 1. Delete all inflated readings from Mar 6 onwards
    const del = await client.query(`
      DELETE FROM readings WHERE timestamp >= '2026-03-06T00:00:00Z'
    `);

    // 2. Get all meters
    const { rows: meters } = await client.query(`
      SELECT m.id, m.phase_type,
             r.energy_kwh_total AS last_energy
      FROM meters m
      LEFT JOIN LATERAL (
        SELECT energy_kwh_total
        FROM readings
        WHERE meter_id = m.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) r ON true
    `);

    // 3. Re-generate hourly readings from Mar 6 00:00 to now
    const start = new Date('2026-03-06T00:00:00Z');
    const now = new Date();
    const totalHours = Math.floor((now - start) / 3600000);

    let totalInserted = 0;

    // Process in chunks of 24 hours
    for (let h = 0; h < totalHours; h += 24) {
      const chunkEnd = Math.min(h + 24, totalHours);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (let hh = h; hh < chunkEnd; hh++) {
        const ts = new Date(start.getTime() + hh * 3600000);
        const hour = ts.getUTCHours();
        const isDay = hour >= 8 && hour <= 20;
        const timeFactor = isDay ? 1.0 + 0.2 * Math.sin(Math.PI * (hour - 8) / 12) : 0.65;

        for (const m of meters) {
          const is3P = m.phase_type === '3P';
          const nominalPower = is3P ? 2.5 : 0.85;
          const basePower = nominalPower * timeFactor;
          const power = Math.max(0.05, basePower * (0.9 + Math.random() * 0.2));

          const lastEnergy = m.last_energy != null ? Number(m.last_energy) : 1000;
          const energy = lastEnergy + power * (hh + 1);

          const v1 = 229.5 + (Math.random() - 0.5) * 4;
          const v2 = is3P ? 229.5 + (Math.random() - 0.5) * 4 : null;
          const v3 = is3P ? 229.5 + (Math.random() - 0.5) * 4 : null;

          const pf = 0.87 + Math.random() * 0.12;
          const i1 = is3P
            ? (power * 1000) / (v1 * pf * 1.732) / 3
            : (power * 1000) / (v1 * pf);
          const i2 = is3P ? i1 * (0.95 + Math.random() * 0.1) : null;
          const i3 = is3P ? i1 * (0.95 + Math.random() * 0.1) : null;

          const reactive = power * Math.tan(Math.acos(pf));
          const freq = 49.97 + Math.random() * 0.06;
          const thdV = is3P && Math.random() > 0.3 ? 1.5 + Math.random() * 3 : null;
          const thdI = is3P && Math.random() > 0.3 ? 3 + Math.random() * 8 : null;
          const phaseImb = is3P ? Math.abs(v1 - (v2 || v1)) / v1 * 100 : null;

          const row = [
            m.id, ts.toISOString(),
            r(v1), r(v2), r(v3),
            r(i1), r(i2), r(i3),
            r(power), r(reactive), r(pf), r(freq), r(energy),
            r(thdV), r(thdI), r(phaseImb),
          ];

          const placeholders = row.map(() => `$${paramIdx++}`);
          values.push(`(${placeholders.join(',')})`);
          params.push(...row);
        }
      }

      if (values.length > 0) {
        await client.query(`
          INSERT INTO readings (
            meter_id, timestamp,
            voltage_l1, voltage_l2, voltage_l3,
            current_l1, current_l2, current_l3,
            power_kw, reactive_power_kvar, power_factor, frequency_hz,
            energy_kwh_total, thd_voltage_pct, thd_current_pct, phase_imbalance_pct
          ) VALUES ${values.join(',')}
        `, params);
        totalInserted += values.length;
      }
    }

    return {
      deleted: del.rowCount,
      inserted: totalInserted,
      hours: totalHours,
      meters: meters.length,
    };
  } finally {
    await client.end();
  }
};

function r(v) {
  return v == null ? null : Math.round(v * 1000) / 1000;
}
