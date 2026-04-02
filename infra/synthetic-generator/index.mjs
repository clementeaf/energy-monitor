import { readFileSync } from 'fs';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Client } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Statistical profiles extracted from historical CSV data.
 * Per meter → per hour → { field: [mean, std] }
 * Fields: vL1, vL2, vL3, iL1, iL2, iL3, pKw, qKvar, pf, freq, thdV, thdI, phImb
 */
const PROFILES = JSON.parse(
  readFileSync(join(__dirname, 'profiles.json'), 'utf-8'),
);

/** Normal-distributed random using Box-Muller transform */
function randNormal(mean, std) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

/** Sample a value from the profile, clamping to reasonable bounds */
function sample(profile, field, fallback = null) {
  if (!profile || !profile[field]) return fallback;
  const [mean, std] = profile[field];
  return randNormal(mean, std);
}

/** Round to 3 decimals, preserve null */
function r(v) {
  return v == null ? null : Math.round(v * 1000) / 1000;
}

/**
 * Synthetic readings generator — inserts 1 reading per meter every invocation.
 * Uses real statistical profiles (mean + stdev per meter per hour) from historical data.
 * Designed to run every 15 minutes via EventBridge.
 * After inserting, prunes the oldest reading per meter to keep DB stable.
 * Also refreshes meter_latest_reading cache table.
 * TEMPORARY: replace with real MQTT → Lambda → RDS pipeline.
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
    // 1. Get all meters with their last energy reading
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

    if (meters.length === 0) {
      return { inserted: 0 };
    }

    // 2. Generate readings using statistical profiles
    const now = new Date();
    const hour = now.getUTCHours();

    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const m of meters) {
      const is3P = m.phase_type === '3P';
      const meterProfile = PROFILES[m.id];
      const hourProfile = meterProfile ? meterProfile[String(hour)] : null;

      // Sample from statistical profile
      const vL1 = sample(hourProfile, 'vL1', 230);
      const vL2 = is3P ? sample(hourProfile, 'vL2', 230) : null;
      const vL3 = is3P ? sample(hourProfile, 'vL3', 230) : null;

      const iL1 = Math.max(0, sample(hourProfile, 'iL1', 5));
      const iL2 = is3P ? Math.max(0, sample(hourProfile, 'iL2', 5)) : null;
      const iL3 = is3P ? Math.max(0, sample(hourProfile, 'iL3', 5)) : null;

      const power = Math.max(0.01, sample(hourProfile, 'pKw', 1));
      const reactive = Math.max(0, sample(hourProfile, 'qKvar', 0.5));

      // PF: clamp to [0.7, 1.0]
      const pf = Math.min(1.0, Math.max(0.7, sample(hourProfile, 'pf', 0.92)));

      // Frequency: clamp to [49.8, 50.2]
      const freq = Math.min(50.2, Math.max(49.8, sample(hourProfile, 'freq', 50)));

      // Energy: accumulate from last reading (1 min = 1/60 hour)
      const lastEnergy = m.last_energy != null ? Number(m.last_energy) : 1000;
      const energy = lastEnergy + power / 60;

      // THD and phase imbalance (3P only, may be null in profile)
      const thdV = is3P ? sample(hourProfile, 'thdV', null) : null;
      const thdI = is3P ? sample(hourProfile, 'thdI', null) : null;
      const phImb = is3P ? sample(hourProfile, 'phImb', null) : null;

      const row = [
        m.id, now.toISOString(),
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

    // 3. Batch INSERT
    await client.query(`
      INSERT INTO readings (
        meter_id, timestamp,
        voltage_l1, voltage_l2, voltage_l3,
        current_l1, current_l2, current_l3,
        power_kw, reactive_power_kvar, power_factor, frequency_hz,
        energy_kwh_total, thd_voltage_pct, thd_current_pct, phase_imbalance_pct
      ) VALUES ${values.join(',')}
    `, params);

    // 4. Prune oldest reading per meter (keep DB size stable)
    await client.query(`
      DELETE FROM readings r
      USING (
        SELECT meter_id, MIN(timestamp) AS oldest_ts
        FROM readings
        GROUP BY meter_id
      ) old
      WHERE r.meter_id = old.meter_id AND r.timestamp = old.oldest_ts
    `);

    // 5. Update meters last_reading_at + status
    await client.query(`
      UPDATE meters SET last_reading_at = $1, status = 'online'
    `, [now.toISOString()]);

    // 6. Refresh meter_latest_reading cache
    await client.query(`
      INSERT INTO meter_latest_reading (meter_id, power_kw, voltage_l1, current_l1, power_factor, timestamp)
      SELECT s.meter_id, r.power_kw, r.voltage_l1, r.current_l1, r.power_factor, r.timestamp
      FROM store s
      LEFT JOIN LATERAL (
        SELECT power_kw, voltage_l1, current_l1, power_factor, timestamp
        FROM meter_readings
        WHERE meter_id = s.meter_id
        ORDER BY timestamp DESC
        LIMIT 1
      ) r ON true
      ON CONFLICT (meter_id) DO UPDATE SET
        power_kw = EXCLUDED.power_kw,
        voltage_l1 = EXCLUDED.voltage_l1,
        current_l1 = EXCLUDED.current_l1,
        power_factor = EXCLUDED.power_factor,
        timestamp = EXCLUDED.timestamp
    `);

    return { inserted: meters.length, pruned: meters.length, timestamp: now.toISOString() };
  } finally {
    await client.end();
  }
};
