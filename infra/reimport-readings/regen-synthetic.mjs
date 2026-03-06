import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * One-shot: delete all synthetic readings (post-CSV period) and
 * regenerate them using real statistical profiles from the historical CSV.
 * Generates hourly readings from the end of CSV data until now.
 */

const PROFILES = JSON.parse(
  readFileSync(join(__dirname, 'profiles.json'), 'utf-8'),
);

function randNormal(mean, std) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

function sample(profile, field, fallback) {
  if (!profile?.[field]) return fallback;
  const [mean, std] = profile[field];
  return randNormal(mean, std);
}

function r(v) {
  return v == null ? null : Math.round(v * 1000) / 1000;
}

export const handler = async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // 1. Find where CSV data ends (per meter)
    const { rows: meterEnds } = await client.query(`
      SELECT meter_id, MAX(timestamp) AS last_csv_ts, MAX(energy_kwh_total) AS last_energy
      FROM readings
      WHERE timestamp < '2026-03-02T00:00:00Z'
      GROUP BY meter_id
    `);

    // 2. Get meter metadata
    const { rows: meters } = await client.query(`SELECT id, phase_type FROM meters`);
    const meterMap = {};
    for (const m of meters) meterMap[m.id] = m;

    // 3. Delete ALL synthetic readings (post-CSV)
    const del = await client.query(`DELETE FROM readings WHERE timestamp >= '2026-03-02T00:00:00Z'`);
    console.log(`Deleted ${del.rowCount} synthetic rows.`);

    // 4. Regenerate hourly readings from end of CSV to now
    const now = new Date();
    let totalInserted = 0;

    for (const me of meterEnds) {
      const mid = me.meter_id;
      const meter = meterMap[mid];
      if (!meter) continue;

      const is3P = meter.phase_type === '3P';
      const meterProfile = PROFILES[mid];
      let energy = Number(me.last_energy);
      const startTs = new Date(me.last_csv_ts);
      startTs.setTime(startTs.getTime() + 3600000); // start 1 hour after last CSV reading

      const totalHours = Math.floor((now - startTs) / 3600000);
      if (totalHours <= 0) continue;

      // Process in chunks of 24 hours
      for (let h = 0; h < totalHours; h += 24) {
        const chunkEnd = Math.min(h + 24, totalHours);
        const values = [];
        const params = [];
        let paramIdx = 1;

        for (let hh = h; hh < chunkEnd; hh++) {
          const ts = new Date(startTs.getTime() + hh * 3600000);
          const hour = ts.getUTCHours();
          const hourProfile = meterProfile ? meterProfile[String(hour)] : null;

          const vL1 = sample(hourProfile, 'vL1', 230);
          const vL2 = is3P ? sample(hourProfile, 'vL2', 230) : null;
          const vL3 = is3P ? sample(hourProfile, 'vL3', 230) : null;
          const iL1 = Math.max(0, sample(hourProfile, 'iL1', 5));
          const iL2 = is3P ? Math.max(0, sample(hourProfile, 'iL2', 5)) : null;
          const iL3 = is3P ? Math.max(0, sample(hourProfile, 'iL3', 5)) : null;
          const power = Math.max(0.01, sample(hourProfile, 'pKw', 1));
          const reactive = Math.max(0, sample(hourProfile, 'qKvar', 0.5));
          const pf = Math.min(1.0, Math.max(0.7, sample(hourProfile, 'pf', 0.92)));
          const freq = Math.min(50.2, Math.max(49.8, sample(hourProfile, 'freq', 50)));
          const thdV = is3P ? sample(hourProfile, 'thdV', null) : null;
          const thdI = is3P ? sample(hourProfile, 'thdI', null) : null;
          const phImb = is3P ? sample(hourProfile, 'phImb', null) : null;

          energy += power; // 1 hour of power = kWh

          const row = [
            mid, ts.toISOString(),
            r(vL1), r(vL2), r(vL3),
            r(iL1), r(iL2), r(iL3),
            r(power), r(reactive), r(pf), r(freq),
            r(energy),
            r(thdV), r(thdI), r(phImb),
          ];

          const placeholders = row.map(() => `$${paramIdx++}`);
          values.push(`(${placeholders.join(',')})`);
          params.push(...row);
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
    }

    // 5. Update last_reading_at
    await client.query(`
      UPDATE meters m SET last_reading_at = sub.max_ts
      FROM (SELECT meter_id, MAX(timestamp) as max_ts FROM readings GROUP BY meter_id) sub
      WHERE m.id = sub.meter_id
    `);

    return { deleted: del.rowCount, inserted: totalInserted };
  } finally {
    await client.end();
  }
};
