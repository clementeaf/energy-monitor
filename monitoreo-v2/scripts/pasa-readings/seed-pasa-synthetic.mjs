#!/usr/bin/env node
/**
 * Synthetic PASA dev seed: 5 buildings, meters per building, 7 days of 15-min readings.
 *
 * Usage:
 *   npm run seed
 *   METERS_PER_BUILDING=5 DAYS=7 npm run seed
 *
 * Faster than CSV import for local dashboard smoke tests.
 */

import { PASA_TENANT_ID } from './lib/constants.mjs';
import { connectDb, loadBuildingMap } from './lib/db.mjs';
import { insertReadingsBatch, loadMeterIdByCode, upsertMeterFromCatalog } from './lib/meter-catalog.mjs';
import { printSummary, refreshAggregates } from './lib/refresh-aggregates.mjs';
import { parsePositiveInt } from './lib/csv-record.mjs';

const METERS_PER_BUILDING = parsePositiveInt(process.env.METERS_PER_BUILDING, 5);
const DAYS = parsePositiveInt(process.env.DAYS, 7);
const INTERVAL_MINUTES = 15;

const BUILDING_PREFIXES = {
  MG: 'MG',
  MM: 'MM',
  OT: 'OT',
  SC52: 'SC52',
  SC53: 'SC53',
};

/**
 * Generate synthetic catalog row for a meter code.
 * @param {string} code - Meter code
 * @param {string} buildingCode - Building code
 * @param {number} index - Meter index within building
 * @returns {import('./lib/csv-record.mjs').MeterCatalogRow}
 */
function buildSyntheticCatalog(code, buildingCode, index) {
  return {
    code,
    buildingCode,
    name: index === 1 ? 'Servicios comunes' : `Local ${index}`,
    model: index === 1 ? 'PAC1670' : 'PAC1651',
    phaseType: index === 1 ? 'three_phase' : 'single_phase',
    modbusAddress: index,
    uplinkRoute: `${buildingCode}-Bus1/MQTT`,
    storeType: index === 1 ? 'SSCC' : 'Retail',
    centerName: `Synthetic ${buildingCode}`,
    centerType: buildingCode.startsWith('SC') ? 'Strip Center' : 'Mall',
  };
}

/**
 * Generate one synthetic reading row.
 * @param {string} meterCode - Meter code
 * @param {Date} timestamp - Reading timestamp
 * @param {number} baseKw - Base power kW
 * @param {number} energyAccumulator - Running kWh total
 * @returns {import('./lib/csv-record.mjs').ReadingRow & { source: string }}
 */
function buildSyntheticReading(meterCode, timestamp, baseKw, energyAccumulator) {
  const powerKw = baseKw + Math.sin(timestamp.getTime() / 3600000) * 2;
  const deltaKwh = (powerKw * INTERVAL_MINUTES) / 60;
  return {
    meterCode,
    timestamp: timestamp.toISOString(),
    voltageL1: 230,
    voltageL2: null,
    voltageL3: null,
    currentL1: powerKw / 0.23,
    currentL2: null,
    currentL3: null,
    powerKw,
    reactivePowerKvar: powerKw * 0.15,
    powerFactor: 0.92,
    frequencyHz: 50,
    energyKwhTotal: energyAccumulator + deltaKwh,
    source: 'csv:synthetic',
  };
}

async function main() {
  const client = await connectDb();
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + DAYS);

  console.log(`[seed] ${METERS_PER_BUILDING} meters/building × ${DAYS} days`);

  try {
    const buildingMap = await loadBuildingMap(client, PASA_TENANT_ID);
    const meterIdByCode = await loadMeterIdByCode(client, PASA_TENANT_ID);
    const batch = [];
    let inserted = 0;

    for (const [buildingCode, prefix] of Object.entries(BUILDING_PREFIXES)) {
      if (!buildingMap.has(buildingCode)) {
        console.warn(`[seed] building ${buildingCode} missing — skip`);
        continue;
      }

      for (let i = 1; i <= METERS_PER_BUILDING; i += 1) {
        const code = `${prefix}-${String(i).padStart(3, '0')}`;
        const catalog = buildSyntheticCatalog(code, buildingCode, i);
        await upsertMeterFromCatalog(
          client,
          PASA_TENANT_ID,
          buildingMap,
          catalog,
          meterIdByCode,
        );

        let energy = 0;
        const baseKw = 5 + i * 1.5;
        for (let ts = new Date(start); ts < end; ts.setUTCMinutes(ts.getUTCMinutes() + INTERVAL_MINUTES)) {
          const reading = buildSyntheticReading(code, new Date(ts), baseKw, energy);
          energy = reading.energyKwhTotal;
          batch.push(reading);

          if (batch.length >= 1000) {
            inserted += await insertReadingsBatch(client, PASA_TENANT_ID, meterIdByCode, batch);
            batch.length = 0;
          }
        }
      }
    }

    if (batch.length > 0) {
      inserted += await insertReadingsBatch(client, PASA_TENANT_ID, meterIdByCode, batch);
    }

    console.log(`[seed] inserted ${inserted} readings`);
    await refreshAggregates(client, start.toISOString(), end.toISOString());
    await printSummary(client, PASA_TENANT_ID);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
