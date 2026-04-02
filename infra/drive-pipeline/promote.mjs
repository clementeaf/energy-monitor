/**
 * promote.mjs — Staging → Readings promotion pipeline
 *
 * Phases:
 *   validate  — Run QA checks on staging, abort if critical failures
 *   catalog   — Discover buildings/meters from staging, create catalog entries
 *   promote   — INSERT INTO readings SELECT FROM staging (per source_file)
 *   verify    — Count check, sample spot-check
 *   all       — Run all phases sequentially (default)
 *
 * Environment:
 *   PHASE          validate | catalog | promote | verify | all (default: all)
 *   DRY_RUN        true to print SQL without executing writes (default: false)
 *   BATCH_SIZE     rows per INSERT batch during promotion (default: 10000)
 *   AWS_REGION     (default: us-east-1)
 *   DB_SECRET_NAME (default: energy-monitor/drive-ingest/db)
 *   DB_HOST        override for local SSH tunnel (e.g. 127.0.0.1)
 *   DB_PORT        override for local SSH tunnel (e.g. 5433)
 */

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const PHASE = process.env.PHASE || 'all';
const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '10000', 10);

// ─── Connection ────────────────────────────────────────────────

async function getSecretJson(secretId) {
  const secretsClient = new SecretsManagerClient({ region: REGION });
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} does not contain SecretString`);
  }
  return JSON.parse(response.SecretString);
}

function buildDbConfig(secret) {
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: secret.dbname || secret.database || secret.DB_NAME,
    user: secret.username || secret.user || secret.DB_USERNAME,
    password: secret.password || secret.DB_PASSWORD,
    ssl: getPgSslOptionsForRds(),
  };
}

// ─── Helpers ───────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fmt(n) {
  return Number(n).toLocaleString('en-US');
}

function log(phase, message) {
  console.log(`[${phase}] ${message}`);
}

function logTable(rows) {
  if (rows.length === 0) return;
  console.table(rows);
}

// ─── Phase 1: Validate ────────────────────────────────────────

async function phaseValidate(client) {
  log('validate', 'Running QA checks on readings_import_staging...');
  const issues = [];

  // 1. Row counts per file
  const files = (await client.query(`
    SELECT source_file, COUNT(*)::bigint AS row_count
    FROM readings_import_staging
    GROUP BY source_file
    ORDER BY source_file
  `)).rows;

  log('validate', `Files in staging: ${files.length}`);
  logTable(files);

  if (files.length === 0) {
    log('validate', 'Staging table is empty — nothing to promote (skipping)');
    return null;
  }

  // 2. Meter inventory
  const meters = (await client.query(`
    SELECT meter_id, model, phase_type, center_name,
           COUNT(*)::bigint AS row_count,
           MIN(timestamp) AS min_ts, MAX(timestamp) AS max_ts
    FROM readings_import_staging
    GROUP BY meter_id, model, phase_type, center_name
    ORDER BY center_name, meter_id
  `)).rows;

  log('validate', `Distinct meters in staging: ${meters.length}`);

  // 3. Check meter_id length for VARCHAR(10) compatibility
  const longIds = meters.filter(m => m.meter_id.length > 10);
  if (longIds.length > 0) {
    issues.push(`${longIds.length} meter_id(s) exceed VARCHAR(10): ${longIds.map(m => m.meter_id).join(', ')}`);
  }

  // 4. Duplicates
  const duplicates = (await client.query(`
    SELECT meter_id, timestamp, COUNT(*)::bigint AS dup_count
    FROM readings_import_staging
    GROUP BY meter_id, timestamp
    HAVING COUNT(*) > 1
    ORDER BY meter_id, timestamp
    LIMIT 20
  `)).rows;

  if (duplicates.length > 0) {
    log('validate', `WARNING: ${duplicates.length}+ duplicate (meter_id, timestamp) pairs found`);
    logTable(duplicates);
    issues.push(`Duplicate (meter_id, timestamp) pairs detected (showing first ${duplicates.length})`);
  } else {
    log('validate', 'No duplicate (meter_id, timestamp) pairs');
  }

  // 5. Model/phase consistency
  const invalidModelPhase = (await client.query(`
    SELECT meter_id, model, phase_type, COUNT(*)::bigint AS row_count
    FROM readings_import_staging
    WHERE (model = 'PAC1670' AND phase_type <> '3P')
       OR (model = 'PAC1651' AND phase_type <> '1P')
    GROUP BY meter_id, model, phase_type
    LIMIT 20
  `)).rows;

  if (invalidModelPhase.length > 0) {
    issues.push(`${invalidModelPhase.length} meter(s) with model/phase mismatch`);
    logTable(invalidModelPhase);
  } else {
    log('validate', 'Model/phase consistency OK');
  }

  // 6. Single-phase with L2/L3 values
  const invalidSinglePhase = (await client.query(`
    SELECT meter_id, COUNT(*)::bigint AS row_count
    FROM readings_import_staging
    WHERE phase_type = '1P'
      AND (voltage_l2 IS NOT NULL OR voltage_l3 IS NOT NULL
           OR current_l2 IS NOT NULL OR current_l3 IS NOT NULL)
    GROUP BY meter_id
    LIMIT 20
  `)).rows;

  if (invalidSinglePhase.length > 0) {
    issues.push(`${invalidSinglePhase.length} 1P meter(s) with non-NULL L2/L3 values`);
    logTable(invalidSinglePhase);
  } else {
    log('validate', 'Single-phase L2/L3 nulls OK');
  }

  // 7. Non-monotonic energy
  const nonMonotonic = (await client.query(`
    WITH ordered AS (
      SELECT meter_id, timestamp, energy_kwh_total,
             LAG(energy_kwh_total) OVER (PARTITION BY meter_id ORDER BY timestamp) AS prev_energy
      FROM readings_import_staging
    )
    SELECT meter_id, COUNT(*)::bigint AS decreases
    FROM ordered
    WHERE prev_energy IS NOT NULL AND energy_kwh_total < prev_energy
    GROUP BY meter_id
    ORDER BY meter_id
    LIMIT 20
  `)).rows;

  if (nonMonotonic.length > 0) {
    issues.push(`${nonMonotonic.length} meter(s) with non-monotonic energy_kwh_total`);
    logTable(nonMonotonic);
  } else {
    log('validate', 'Energy monotonicity OK');
  }

  // 8. Negative power
  const negativePower = (await client.query(`
    SELECT meter_id, COUNT(*)::bigint AS negative_rows
    FROM readings_import_staging
    WHERE power_kw < 0
    GROUP BY meter_id
    LIMIT 20
  `)).rows;

  if (negativePower.length > 0) {
    issues.push(`${negativePower.length} meter(s) with negative power_kw`);
    logTable(negativePower);
  } else {
    log('validate', 'No negative power_kw');
  }

  // 9. Timestamp step check (sample-based for performance)
  const stepIssues = (await client.query(`
    WITH ordered AS (
      SELECT meter_id, timestamp,
             LAG(timestamp) OVER (PARTITION BY meter_id ORDER BY timestamp) AS prev_ts
      FROM readings_import_staging
    )
    SELECT meter_id,
           COUNT(*) FILTER (WHERE timestamp - prev_ts <> INTERVAL '15 minutes')::bigint AS non_15min_steps,
           COUNT(*)::bigint AS total_transitions
    FROM ordered
    WHERE prev_ts IS NOT NULL
    GROUP BY meter_id
    HAVING COUNT(*) FILTER (WHERE timestamp - prev_ts <> INTERVAL '15 minutes') > 0
    ORDER BY meter_id
    LIMIT 20
  `)).rows;

  if (stepIssues.length > 0) {
    log('validate', `WARNING: ${stepIssues.length} meter(s) with non-15min timestamp steps`);
    logTable(stepIssues);
    issues.push(`Non-15min timestamp steps in ${stepIssues.length} meter(s) — may indicate gaps or irregular data`);
  } else {
    log('validate', 'Timestamp 15-min step OK');
  }

  // Summary
  const totalRows = files.reduce((sum, f) => sum + Number(f.row_count), 0);
  const summary = {
    totalRows: fmt(totalRows),
    files: files.length,
    distinctMeters: meters.length,
    issues: issues.length,
  };

  log('validate', `Summary: ${fmt(totalRows)} rows, ${meters.length} meters, ${files.length} files, ${issues.length} issue(s)`);

  if (issues.length > 0) {
    log('validate', 'Issues found:');
    issues.forEach((issue, i) => log('validate', `  ${i + 1}. ${issue}`));
  }

  // Long meter_ids are critical (FK won't work), others are warnings
  const critical = longIds.length > 0;
  if (critical) {
    throw new Error('Critical validation failure: meter_id(s) exceed VARCHAR(10). Cannot promote.');
  }

  return { summary, meters, files, issues };
}

// ─── Phase 2: Catalog ─────────────────────────────────────────

async function phaseCatalog(client) {
  log('catalog', 'Discovering buildings and meters from staging...');

  // Discover distinct buildings (from center_name)
  const buildings = (await client.query(`
    SELECT DISTINCT center_name, center_type
    FROM readings_import_staging
    ORDER BY center_name
  `)).rows;

  log('catalog', `Discovered ${buildings.length} building(s):`);
  logTable(buildings);

  // Discover distinct meters (store_type, store_name: un valor por medidor)
  const meters = (await client.query(`
    SELECT DISTINCT ON (meter_id)
      meter_id, center_name, model, phase_type, uplink_route, modbus_address,
      store_type, store_name
    FROM readings_import_staging
    ORDER BY meter_id, source_row_number
  `)).rows;

  log('catalog', `Discovered ${meters.length} meter(s)`);

  // Check what already exists
  const existingBuildings = (await client.query(`SELECT id FROM buildings`)).rows.map(r => r.id);
  const existingMeters = (await client.query(`SELECT id FROM meters`)).rows.map(r => r.id);

  // Prepare building inserts
  const buildingRows = buildings.map(b => ({
    id: slugify(b.center_name),
    name: b.center_name,
    center_type: b.center_type,
    isNew: !existingBuildings.includes(slugify(b.center_name)),
  }));

  log('catalog', `Buildings to create: ${buildingRows.filter(b => b.isNew).length} new, ${buildingRows.filter(b => !b.isNew).length} existing`);

  // Prepare meter inserts (store_type, store_name del docx)
  const meterRows = meters.map(m => ({
    id: m.meter_id,
    building_id: slugify(m.center_name),
    model: m.model,
    phase_type: m.phase_type,
    uplink_route: m.uplink_route,
    modbus_address: m.modbus_address,
    store_type: m.store_type || null,
    store_name: m.store_name || null,
    isNew: !existingMeters.includes(m.meter_id),
  }));

  const newMeters = meterRows.filter(m => m.isNew);
  log('catalog', `Meters to create: ${newMeters.length} new, ${meterRows.length - newMeters.length} existing`);

  if (DRY_RUN) {
    log('catalog', '[DRY_RUN] Would insert buildings:');
    logTable(buildingRows.filter(b => b.isNew));
    log('catalog', '[DRY_RUN] Would insert meters (first 20):');
    logTable(newMeters.slice(0, 20));
    return { buildingRows, meterRows };
  }

  // Insert buildings (center_type en columna propia; address sigue con center_type por compatibilidad)
  for (const b of buildingRows.filter(b => b.isNew)) {
    const centerType = b.center_type || '';
    await client.query(
      `INSERT INTO buildings (id, name, address, total_area, center_type)
       VALUES ($1, $2, $3, 0, $4)
       ON CONFLICT (id) DO UPDATE SET center_type = EXCLUDED.center_type`,
      [b.id, b.name, centerType, centerType || null],
    );
    log('catalog', `Created building: ${b.id} (${b.name})`);
  }

  // Insert meters in batches (store_type, store_name si existen columnas)
  let created = 0;
  for (const m of newMeters) {
    await client.query(
      `INSERT INTO meters (id, building_id, model, phase_type, bus_id, modbus_address, uplink_route, status, store_type, store_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'online', $8, $9)
       ON CONFLICT (id) DO UPDATE SET store_type = EXCLUDED.store_type, store_name = EXCLUDED.store_name`,
      [m.id, m.building_id, m.model, m.phase_type, `${m.building_id}-Bus1`, m.modbus_address, m.uplink_route, m.store_type, m.store_name],
    );
    created++;
    if (created % 100 === 0) {
      log('catalog', `Created ${created}/${newMeters.length} meters...`);
    }
  }

  log('catalog', `Catalog complete: ${buildingRows.filter(b => b.isNew).length} buildings, ${created} meters created`);

  // Refresh staging_centers for API GET /buildings (evita GROUP BY sobre millones en cada request)
  if (!DRY_RUN && buildingRows.length > 0) {
    try {
      const meterCountByBuilding = meterRows.reduce((acc, m) => {
        acc[m.building_id] = (acc[m.building_id] ?? 0) + 1;
        return acc;
      }, {});
      await client.query('TRUNCATE staging_centers');
      for (const b of buildingRows) {
        await client.query(
          `INSERT INTO staging_centers (id, center_name, center_type, meters_count, updated_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (id) DO UPDATE SET center_name = EXCLUDED.center_name, center_type = EXCLUDED.center_type, meters_count = EXCLUDED.meters_count, updated_at = NOW()`,
          [b.id, b.name, b.center_type || '', meterCountByBuilding[b.id] ?? 0],
        );
      }
      log('catalog', `Refreshed staging_centers: ${buildingRows.length} row(s)`);
    } catch (err) {
      log('catalog', `staging_centers refresh skipped (table may not exist): ${err.message}`);
    }
  }

  return { buildingRows, meterRows };
}

// ─── Phase 3: Promote ─────────────────────────────────────────

async function phasePromote(client) {
  log('promote', 'Starting promotion: staging → readings...');

  // Get source files to process
  const files = (await client.query(`
    SELECT source_file, COUNT(*)::bigint AS row_count
    FROM readings_import_staging
    GROUP BY source_file
    ORDER BY source_file
  `)).rows;

  // Check if any readings already exist for staging meter_ids
  const alreadyPromoted = (await client.query(`
    SELECT s.source_file, COUNT(DISTINCT r.id)::bigint AS existing_readings
    FROM readings_import_staging s
    JOIN readings r ON r.meter_id = s.meter_id AND r.timestamp = s.timestamp
    GROUP BY s.source_file
    HAVING COUNT(DISTINCT r.id) > 0
  `)).rows;

  if (alreadyPromoted.length > 0) {
    log('promote', 'WARNING: Some staging data already has matching readings:');
    logTable(alreadyPromoted);
    log('promote', 'Using NOT EXISTS to skip already-promoted rows');
  }

  const totalStaging = files.reduce((sum, f) => sum + Number(f.row_count), 0);
  log('promote', `Total rows to promote: ${fmt(totalStaging)} across ${files.length} file(s)`);

  if (DRY_RUN) {
    log('promote', '[DRY_RUN] Would promote all staging rows to readings');
    return { totalStaging, promoted: 0 };
  }

  let totalPromoted = 0;

  for (const file of files) {
    const fileName = file.source_file;
    const fileRows = Number(file.row_count);
    log('promote', `Processing ${fileName} (${fmt(fileRows)} rows)...`);

    // Promote in batches using OFFSET/LIMIT on the staging id
    const { rows: [{ min_id, max_id }] } = await client.query(
      `SELECT MIN(id) AS min_id, MAX(id) AS max_id
       FROM readings_import_staging
       WHERE source_file = $1`,
      [fileName],
    );

    let currentId = Number(min_id);
    const maxId = Number(max_id);
    let filePromoted = 0;

    while (currentId <= maxId) {
      const batchEnd = currentId + BATCH_SIZE;

      const result = await client.query(`
        INSERT INTO readings (
          meter_id, timestamp,
          voltage_l1, voltage_l2, voltage_l3,
          current_l1, current_l2, current_l3,
          power_kw, reactive_power_kvar, power_factor,
          frequency_hz, energy_kwh_total
        )
        SELECT
          s.meter_id, s.timestamp,
          s.voltage_l1, s.voltage_l2, s.voltage_l3,
          s.current_l1, s.current_l2, s.current_l3,
          s.power_kw, s.reactive_power_kvar, s.power_factor,
          s.frequency_hz, s.energy_kwh_total
        FROM readings_import_staging s
        WHERE s.source_file = $1
          AND s.id >= $2 AND s.id < $3
          AND NOT EXISTS (
            SELECT 1 FROM readings r
            WHERE r.meter_id = s.meter_id AND r.timestamp = s.timestamp
          )
      `, [fileName, currentId, batchEnd]);

      const inserted = result.rowCount || 0;
      filePromoted += inserted;
      currentId = batchEnd;

      if (filePromoted % 50000 < BATCH_SIZE) {
        log('promote', `  ${fileName}: ${fmt(filePromoted)} promoted so far...`);
      }
    }

    totalPromoted += filePromoted;
    log('promote', `Completed ${fileName}: ${fmt(filePromoted)} rows promoted`);
  }

  log('promote', `Promotion complete: ${fmt(totalPromoted)} total rows inserted into readings`);

  // Update last_reading_at for promoted meters
  const updated = await client.query(`
    UPDATE meters m
    SET last_reading_at = sub.max_ts, status = 'online'
    FROM (
      SELECT meter_id, MAX(timestamp) AS max_ts
      FROM readings
      WHERE meter_id IN (SELECT DISTINCT meter_id FROM readings_import_staging)
      GROUP BY meter_id
    ) sub
    WHERE m.id = sub.meter_id
  `);
  log('promote', `Updated last_reading_at for ${updated.rowCount} meter(s)`);

  return { totalStaging, promoted: totalPromoted };
}

// ─── Phase 4: Verify ──────────────────────────────────────────

async function phaseVerify(client) {
  log('verify', 'Running post-promotion verification...');

  // 1. Count comparison
  const stagingCount = (await client.query(`
    SELECT COUNT(*)::bigint AS total FROM readings_import_staging
  `)).rows[0].total;

  const promotedMeterIds = (await client.query(`
    SELECT DISTINCT meter_id FROM readings_import_staging
  `)).rows.map(r => r.meter_id);

  const readingsCount = (await client.query(`
    SELECT COUNT(*)::bigint AS total
    FROM readings
    WHERE meter_id = ANY($1)
  `, [promotedMeterIds])).rows[0].total;

  log('verify', `Staging rows: ${fmt(stagingCount)}`);
  log('verify', `Readings for promoted meters: ${fmt(readingsCount)}`);

  const delta = Number(readingsCount) - Number(stagingCount);
  if (delta < 0) {
    log('verify', `WARNING: ${fmt(Math.abs(delta))} fewer readings than staging rows (possible dedup or skips)`);
  } else if (delta === 0) {
    log('verify', 'Count match: staging rows == readings (exact match)');
  } else {
    log('verify', `${fmt(delta)} more readings than staging (pre-existing data for these meters)`);
  }

  // 2. Per-file counts
  const perFile = (await client.query(`
    SELECT
      s.source_file,
      COUNT(DISTINCT s.id)::bigint AS staging_rows,
      COUNT(DISTINCT r.id)::bigint AS reading_rows
    FROM readings_import_staging s
    LEFT JOIN readings r ON r.meter_id = s.meter_id AND r.timestamp = s.timestamp
    GROUP BY s.source_file
    ORDER BY s.source_file
  `)).rows;

  log('verify', 'Per-file comparison:');
  logTable(perFile);

  // 3. Sample spot-check: compare a few random rows
  const spotCheck = (await client.query(`
    SELECT
      s.meter_id,
      s.timestamp,
      s.power_kw AS staging_power,
      r.power_kw AS readings_power,
      s.energy_kwh_total AS staging_energy,
      r.energy_kwh_total AS readings_energy,
      CASE WHEN r.id IS NOT NULL THEN 'OK' ELSE 'MISSING' END AS status
    FROM readings_import_staging s
    LEFT JOIN readings r ON r.meter_id = s.meter_id AND r.timestamp = s.timestamp
    ORDER BY RANDOM()
    LIMIT 10
  `)).rows;

  log('verify', 'Random sample spot-check:');
  logTable(spotCheck);

  const missing = spotCheck.filter(r => r.status === 'MISSING');
  if (missing.length > 0) {
    log('verify', `WARNING: ${missing.length}/10 sampled rows are MISSING from readings`);
  } else {
    log('verify', 'All 10 sampled rows found in readings');
  }

  // 4. Catalog verification
  const meterStatus = (await client.query(`
    SELECT m.id, m.building_id, m.model, m.status, m.last_reading_at,
           COUNT(r.id)::bigint AS reading_count
    FROM meters m
    LEFT JOIN readings r ON r.meter_id = m.id
    WHERE m.id IN (SELECT DISTINCT meter_id FROM readings_import_staging)
    GROUP BY m.id
    ORDER BY m.building_id, m.id
    LIMIT 30
  `)).rows;

  log('verify', `Meter catalog status (first 30 of ${promotedMeterIds.length}):`);
  logTable(meterStatus);

  return { stagingCount, readingsCount, delta, missing: missing.length };
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  promote.mjs — Staging → Readings Promotion Pipeline');
  console.log(`  Phase: ${PHASE} | DRY_RUN: ${DRY_RUN} | BATCH_SIZE: ${fmt(BATCH_SIZE)}`);
  console.log('='.repeat(60));

  const dbSecret = await getSecretJson(DB_SECRET_NAME);
  const client = new Client(buildDbConfig(dbSecret));
  await client.connect();
  log('main', 'Connected to database');

  try {
    const phases = PHASE === 'all'
      ? ['validate', 'catalog', 'promote', 'verify']
      : [PHASE];

    for (const phase of phases) {
      console.log('\n' + '─'.repeat(60));
      const start = Date.now();

      switch (phase) {
        case 'validate': {
          const result = await phaseValidate(client);
          if (result === null) {
            log('main', 'Staging empty — promotion skipped');
            return;
          }
          break;
        }
        case 'catalog':
          await phaseCatalog(client);
          break;
        case 'promote':
          await phasePromote(client);
          break;
        case 'verify':
          await phaseVerify(client);
          break;
        default:
          throw new Error(`Unknown phase: ${phase}`);
      }

      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      log(phase, `Completed in ${elapsed}s`);
    }

    console.log('\n' + '='.repeat(60));
    log('main', 'All phases completed successfully');
  } finally {
    await client.end();
  }
}

try {
  await main();
} catch (error) {
  console.error('[promote]', error);
  process.exit(1);
}
