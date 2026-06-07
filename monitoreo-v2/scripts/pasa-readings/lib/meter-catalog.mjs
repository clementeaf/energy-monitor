/**
 * Upsert meters discovered from PASA CSV catalog rows.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - PASA tenant UUID
 * @param {Map<string, { id: string; code: string; name: string }>} buildingMap - Buildings by code
 * @param {import('./csv-record.mjs').MeterCatalogRow} catalog - Meter metadata
 * @param {Map<string, string>} meterIdByCode - Cache meter UUID by code
 * @returns {Promise<string>} Meter UUID
 */
export async function upsertMeterFromCatalog(client, tenantId, buildingMap, catalog, meterIdByCode) {
  const cached = meterIdByCode.get(catalog.code);
  if (cached) {
    return cached;
  }

  const building = buildingMap.get(catalog.buildingCode);
  if (!building) {
    throw new Error(`Building code ${catalog.buildingCode} not found for meter ${catalog.code}`);
  }

  const metadata = {
    store_type: catalog.storeType,
    center_name: catalog.centerName,
    center_type: catalog.centerType,
    csv_model: catalog.model,
  };

  const loadCategory = catalog.storeType === 'SSCC' ? 'main' : 'tenant';

  const { rows } = await client.query(
    `INSERT INTO meters (
       tenant_id, building_id, name, code, meter_type, model, phase_type,
       modbus_address, bus_id, uplink_route, metadata, load_category, is_active
     ) VALUES (
       $1, $2, $3, $4, 'electrical', $5, $6,
       $7, $8, $9, $10::jsonb, $11, true
     )
     ON CONFLICT (tenant_id, code) DO UPDATE SET
       name = EXCLUDED.name,
       model = EXCLUDED.model,
       phase_type = EXCLUDED.phase_type,
       modbus_address = EXCLUDED.modbus_address,
       bus_id = EXCLUDED.bus_id,
       uplink_route = EXCLUDED.uplink_route,
       metadata = EXCLUDED.metadata,
       load_category = EXCLUDED.load_category,
       updated_at = NOW()
     RETURNING id`,
    [
      tenantId,
      building.id,
      catalog.name,
      catalog.code,
      catalog.model,
      catalog.phaseType,
      catalog.modbusAddress,
      `${building.code}-Bus1`,
      catalog.uplinkRoute,
      JSON.stringify(metadata),
      loadCategory,
    ],
  );

  const meterId = rows[0].id;
  meterIdByCode.set(catalog.code, meterId);
  return meterId;
}

/**
 * Batch-insert readings with idempotency on (meter_id, timestamp, source).
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - PASA tenant UUID
 * @param {Map<string, string>} meterIdByCode - Meter UUID cache
 * @param {Array<import('./csv-record.mjs').ReadingRow & { source: string }>} batch - Rows to insert
 * @returns {Promise<number>} Inserted row count
 */
export async function insertReadingsBatch(client, tenantId, meterIdByCode, batch) {
  if (batch.length === 0) {
    return 0;
  }

  const values = [];
  const params = [];
  let paramIndex = 1;

  for (const row of batch) {
    const meterId = meterIdByCode.get(row.meterCode);
    if (!meterId) {
      throw new Error(`Meter UUID missing for code ${row.meterCode}`);
    }

    values.push(
      `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`,
    );

    params.push(
      tenantId,
      meterId,
      row.timestamp,
      row.voltageL1,
      row.voltageL2,
      row.voltageL3,
      row.currentL1,
      row.currentL2,
      row.currentL3,
      row.powerKw,
      row.reactivePowerKvar,
      row.powerFactor,
      row.frequencyHz,
      row.energyKwhTotal,
      'measured',
      row.source,
      new Date().toISOString(),
    );
  }

  const sql = `
    INSERT INTO readings (
      tenant_id, meter_id, timestamp,
      voltage_l1, voltage_l2, voltage_l3,
      current_l1, current_l2, current_l3,
      power_kw, reactive_power_kvar, power_factor, frequency_hz, energy_kwh_total,
      quality, source, ingested_at
    ) VALUES ${values.join(', ')}
    ON CONFLICT (meter_id, timestamp, source) WHERE source IS NOT NULL DO NOTHING
  `;

  const result = await client.query(sql, params);
  return result.rowCount ?? 0;
}

/**
 * Preload existing meter UUIDs for PASA tenant.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - PASA tenant UUID
 * @returns {Promise<Map<string, string>>}
 */
export async function loadMeterIdByCode(client, tenantId) {
  const { rows } = await client.query(
    `SELECT id, code FROM meters WHERE tenant_id = $1`,
    [tenantId],
  );
  const map = new Map();
  for (const row of rows) {
    map.set(row.code, row.id);
  }
  return map;
}
