import pg from 'pg';
const { Client } = pg;

/**
 * Synthetic readings generator — inserts 1 reading per meter every invocation.
 * Designed to run every 1 minute via EventBridge.
 * TEMPORARY: replace with real MQTT → Lambda → RDS pipeline.
 */
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
    // 1. Get all meters with their last reading
    const { rows: meters } = await client.query(`
      SELECT m.id, m.phase_type,
             r.power_kw AS last_power,
             r.energy_kwh_total AS last_energy,
             r.voltage_l1 AS last_v1
      FROM meters m
      LEFT JOIN LATERAL (
        SELECT power_kw, energy_kwh_total, voltage_l1
        FROM readings
        WHERE meter_id = m.id
        ORDER BY timestamp DESC
        LIMIT 1
      ) r ON true
    `);

    if (meters.length === 0) {
      return { inserted: 0 };
    }

    // 2. Generate synthetic readings
    const now = new Date();
    const hour = now.getUTCHours();
    const isDay = hour >= 8 && hour <= 20;
    const timeFactor = isDay ? 1.0 + 0.2 * Math.sin(Math.PI * (hour - 8) / 12) : 0.65;

    const values = [];
    const params = [];
    let paramIdx = 1;

    for (const m of meters) {
      const is3P = m.phase_type === '3P';

      // Power: use fixed base range matching historical data, NOT last reading
      // Historical data shows: 3P meters ~2-3 kW, 1P meters ~0.5-1.2 kW
      const nominalPower = is3P ? 2.5 : 0.85;
      const basePower = nominalPower * timeFactor;
      const power = Math.max(0.05, basePower * (0.90 + Math.random() * 0.20));

      // Energy: accumulate (1 minute = 1/60 hour)
      const lastEnergy = m.last_energy != null ? Number(m.last_energy) : 1000;
      const energy = lastEnergy + power / 60;

      // Voltage: 228-232V with small noise
      const v1 = 229.5 + (Math.random() - 0.5) * 4;
      const v2 = is3P ? 229.5 + (Math.random() - 0.5) * 4 : null;
      const v3 = is3P ? 229.5 + (Math.random() - 0.5) * 4 : null;

      // Current: derived from power (I = P*1000 / (V * PF * sqrt(3) for 3P, or V * PF for 1P))
      const pf = 0.87 + Math.random() * 0.12;
      const i1 = is3P
        ? (power * 1000) / (v1 * pf * 1.732) / 3
        : (power * 1000) / (v1 * pf);
      const i2 = is3P ? i1 * (0.95 + Math.random() * 0.1) : null;
      const i3 = is3P ? i1 * (0.95 + Math.random() * 0.1) : null;

      // Reactive power
      const reactive = power * Math.tan(Math.acos(pf));

      // Frequency: 49.95-50.05
      const freq = 49.97 + Math.random() * 0.06;

      // THD and phase imbalance (occasional non-null for 3P)
      const thdV = is3P && Math.random() > 0.3 ? 1.5 + Math.random() * 3 : null;
      const thdI = is3P && Math.random() > 0.3 ? 3 + Math.random() * 8 : null;
      const phaseImb = is3P ? Math.abs(v1 - (v2 || v1)) / v1 * 100 : null;

      const row = [
        m.id,                          // meter_id
        now.toISOString(),             // timestamp
        r(v1), r(v2), r(v3),          // voltage L1/L2/L3
        r(i1), r(i2), r(i3),          // current L1/L2/L3
        r(power),                      // power_kw
        r(reactive),                   // reactive_power_kvar
        r(pf),                         // power_factor
        r(freq),                       // frequency_hz
        r(energy),                     // energy_kwh_total
        r(thdV), r(thdI), r(phaseImb), // thd_v, thd_i, phase_imbalance
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

    // 4. Update meters last_reading_at + status
    await client.query(`
      UPDATE meters SET last_reading_at = $1, status = 'online'
    `, [now.toISOString()]);

    return { inserted: meters.length, timestamp: now.toISOString() };
  } finally {
    await client.end();
  }
};

/** Round to 3 decimals, preserve null */
function r(v) {
  return v == null ? null : Math.round(v * 1000) / 1000;
}
