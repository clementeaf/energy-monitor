#!/usr/bin/env node
/**
 * Derive missing PASA frontend data from existing buildings + meters.
 * Idempotent: skips entities that already exist (set FORCE=1 to re-run inserts).
 *
 * Usage:
 *   node seed-pasa-frontend-gaps.mjs
 *   TENANT_SLUG=pasa node seed-pasa-frontend-gaps.mjs
 *   FORCE=1 node seed-pasa-frontend-gaps.mjs
 */

import { connectDb } from './lib/db.mjs';

const TENANT_SLUG = process.env.TENANT_SLUG ?? 'pasa';
const FORCE = process.env.FORCE === '1';

/**
 * Slugify store name into a short unit code.
 * @param {string} name - Display name
 * @param {number} seq - Sequence fallback
 * @returns {string} Unit code max 50 chars
 */
function toUnitCode(name, seq) {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 40);
  return base.length >= 2 ? base : `LOC-${seq}`;
}

/**
 * Resolve PASA tenant id by slug.
 * @param {import('pg').Client} client - DB client
 * @returns {Promise<string>} Tenant UUID
 */
async function resolveTenantId(client) {
  const { rows } = await client.query(
    `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
    [TENANT_SLUG],
  );
  if (rows.length === 0) {
    throw new Error(`Tenant slug not found: ${TENANT_SLUG}`);
  }
  return rows[0].id;
}

/**
 * Return true when table has rows for tenant (optional building scope).
 * @param {import('pg').Client} client - DB client
 * @param {string} table - Table name
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<boolean>}
 */
async function tenantHasRows(client, table, tenantId) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE tenant_id = $1`,
    [tenantId],
  );
  return rows[0].n > 0;
}

/**
 * Seed locatarios from distinct meter names per building.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Units created
 */
async function seedTenantUnits(client, tenantId) {
  if (!FORCE && (await tenantHasRows(client, 'tenant_units', tenantId))) {
    console.log('[skip] tenant_units already populated');
    return 0;
  }

  const { rows: groups } = await client.query(
    `SELECT m.building_id,
            COALESCE(NULLIF(TRIM(m.metadata->>'store_name'), ''), NULLIF(TRIM(m.name), ''), m.code) AS store_name,
            array_agg(m.id ORDER BY m.code) AS meter_ids
     FROM meters m
     WHERE m.tenant_id = $1
     GROUP BY m.building_id, 2
     ORDER BY m.building_id, 2`,
    [tenantId],
  );

  let created = 0;
  let seq = 0;
  for (const g of groups) {
    seq += 1;
    const unitCode = toUnitCode(g.store_name, seq);
    const { rows } = await client.query(
      `INSERT INTO tenant_units (tenant_id, building_id, name, unit_code, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (tenant_id, building_id, unit_code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [tenantId, g.building_id, g.store_name, unitCode],
    );
    const unitId = rows[0].id;
    for (const meterId of g.meter_ids) {
      await client.query(
        `INSERT INTO tenant_unit_meters (tenant_unit_id, meter_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [unitId, meterId],
      );
    }
    created += 1;
  }
  console.log(`[ok] tenant_units: ${created} locatarios, meters linked`);
  return created;
}

/**
 * Seed one active tariff + 3 blocks per building.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Tariffs created
 */
async function seedTariffs(client, tenantId) {
  if (!FORCE && (await tenantHasRows(client, 'tariffs', tenantId))) {
    console.log('[skip] tariffs already populated');
    return 0;
  }

  const { rows: buildings } = await client.query(
    `SELECT id, code, name FROM buildings WHERE tenant_id = $1 ORDER BY code`,
    [tenantId],
  );

  let created = 0;
  for (const b of buildings) {
    const existing = await client.query(
      `SELECT id FROM tariffs WHERE tenant_id = $1 AND building_id = $2 LIMIT 1`,
      [tenantId, b.id],
    );
    let tariffId = existing.rows[0]?.id;
    if (!tariffId) {
      const { rows } = await client.query(
        `INSERT INTO tariffs (tenant_id, building_id, name, effective_from, is_active)
         VALUES ($1, $2, $3, DATE '2026-01-01', true)
         RETURNING id`,
        [tenantId, b.id, `Tarifa regulada ${b.code}`],
      );
      tariffId = rows[0].id;
    }

    const blocks = [
      { block_name: 'punta', hour_start: 18, hour_end: 22, energy_rate: 145.5 },
      { block_name: 'llano', hour_start: 8, hour_end: 17, energy_rate: 98.2 },
      { block_name: 'valle', hour_start: 23, hour_end: 7, energy_rate: 72.4 },
    ];
    for (const blk of blocks) {
      await client.query(
        `INSERT INTO tariff_blocks (tariff_id, block_name, hour_start, hour_end, energy_rate, demand_rate, reactive_rate, fixed_charge)
         SELECT $1::uuid, $2::varchar, $3::smallint, $4::smallint, $5::numeric, 8500, 12.5, 45000
         WHERE NOT EXISTS (
           SELECT 1 FROM tariff_blocks WHERE tariff_id = $1::uuid AND block_name = $2::varchar
         )`,
        [tariffId, blk.block_name, blk.hour_start, blk.hour_end, blk.energy_rate],
      );
    }
    created += 1;
  }
  console.log(`[ok] tariffs: ${created} edificios con bloques punta/llano/valle`);
  return created;
}

/**
 * Seed hierarchy floor + panel and link all meters per building.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Buildings with hierarchy
 */
async function seedHierarchy(client, tenantId) {
  if (!FORCE && (await tenantHasRows(client, 'building_hierarchy', tenantId))) {
    console.log('[skip] building_hierarchy already populated');
    return 0;
  }

  const { rows: buildings } = await client.query(
    `SELECT id, code FROM buildings WHERE tenant_id = $1`,
    [tenantId],
  );

  let created = 0;
  for (const b of buildings) {
    const floor = await client.query(
      `INSERT INTO building_hierarchy (tenant_id, building_id, parent_id, name, level_type, sort_order)
       VALUES ($1, $2, NULL, 'Planta general', 'floor', 1)
       RETURNING id`,
      [tenantId, b.id],
    );
    const floorId = floor.rows[0].id;

    const panel = await client.query(
      `INSERT INTO building_hierarchy (tenant_id, building_id, parent_id, name, level_type, sort_order)
       VALUES ($1, $2, $3, $4, 'panel', 1)
       RETURNING id`,
      [tenantId, b.id, floorId, `Tablero ${b.code}`],
    );
    const panelId = panel.rows[0].id;

    await client.query(
      `INSERT INTO meter_hierarchy (meter_id, hierarchy_node_id)
       SELECT m.id, $2
       FROM meters m
       WHERE m.tenant_id = $1 AND m.building_id = $3
       ON CONFLICT DO NOTHING`,
      [tenantId, panelId, b.id],
    );
    created += 1;
  }
  console.log(`[ok] hierarchy: ${created} edificios (floor → panel → medidores)`);
  return created;
}

/**
 * Seed one concentrator per building and link meters.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Concentrators created
 */
async function seedConcentrators(client, tenantId) {
  if (!FORCE && (await tenantHasRows(client, 'concentrators', tenantId))) {
    console.log('[skip] concentrators already populated');
    return 0;
  }

  const { rows: buildings } = await client.query(
    `SELECT id, code FROM buildings WHERE tenant_id = $1`,
    [tenantId],
  );

  let created = 0;
  for (const b of buildings) {
    const { rows } = await client.query(
      `INSERT INTO concentrators (tenant_id, building_id, name, model, status, last_heartbeat_at, mqtt_connected)
       VALUES ($1, $2, $3, 'PAC4220', 'online', NOW(), true)
       RETURNING id`,
      [tenantId, b.id, `Concentrador ${b.code}`],
    );
    const concId = rows[0].id;
    await client.query(
      `INSERT INTO concentrator_meters (concentrator_id, meter_id, bus_number, modbus_address)
       SELECT $1, m.id, 1, COALESCE(m.modbus_address, 1)
       FROM meters m
       WHERE m.tenant_id = $2 AND m.building_id = $3
       ON CONFLICT DO NOTHING`,
      [concId, tenantId, b.id],
    );
    created += 1;
  }
  console.log(`[ok] concentrators: ${created} PAC4220 + medidores vinculados`);
  return created;
}

/**
 * Seed default alert rules for PASA tenant.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Rules created
 */
async function seedAlertRules(client, tenantId) {
  if (!FORCE && (await tenantHasRows(client, 'alert_rules', tenantId))) {
    console.log('[skip] alert_rules already populated');
    return 0;
  }

  const rules = [
    { code: 'METER_OFFLINE', name: 'Medidor sin comunicación', severity: 'high', config: { offlineMinutes: 30 } },
    { code: 'VOLTAGE_OUT_OF_RANGE', name: 'Voltaje fuera de rango', severity: 'high', config: { tolerancePct: 10 } },
    { code: 'LOW_POWER_FACTOR', name: 'Factor de potencia bajo', severity: 'medium', config: { minPf: 0.85 } },
    { code: 'PEAK_DEMAND_EXCEEDED', name: 'Demanda punta excedida', severity: 'high', config: { maxKw: 500 } },
    { code: 'HIGH_THD', name: 'THD elevado', severity: 'low', config: { maxThd: 8 } },
  ];

  let created = 0;
  for (const r of rules) {
    const { rowCount } = await client.query(
      `INSERT INTO alert_rules (tenant_id, building_id, alert_type_code, name, severity, is_active, config)
       SELECT $1::uuid, NULL, $2::varchar, $3::varchar, $4::varchar, true, $5::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM alert_rules
         WHERE tenant_id = $1::uuid AND building_id IS NULL AND alert_type_code = $2::varchar
       )`,
      [tenantId, r.code, r.name, r.severity, JSON.stringify(r.config)],
    );
    created += rowCount ?? 0;
  }
  console.log(`[ok] alert_rules: ${created} reglas globales`);
  return created;
}

/**
 * Seed demo invoices with line items per building (3 months, mixed statuses).
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Invoices created
 */
async function seedInvoices(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM invoices
     WHERE tenant_id = $1 AND invoice_number LIKE 'INV-PASA-%'`,
    [tenantId],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] demo invoices already seeded');
    return 0;
  }

  const { rows: creatorRows } = await client.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.tenant_id = $1 OR r.slug = 'super_admin'
     ORDER BY CASE WHEN u.tenant_id = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [tenantId],
  );
  const createdBy = creatorRows[0]?.id;
  if (!createdBy) {
    console.log('[skip] invoices: no user for created_by');
    return 0;
  }

  const { rows: buildings } = await client.query(
    `SELECT b.id, b.code, t.id AS tariff_id
     FROM buildings b
     LEFT JOIN LATERAL (
       SELECT id FROM tariffs
       WHERE tenant_id = b.tenant_id AND building_id = b.id AND is_active = true
       ORDER BY effective_from DESC
       LIMIT 1
     ) t ON true
     WHERE b.tenant_id = $1
     ORDER BY b.code`,
    [tenantId],
  );

  const periods = [
    { start: '2026-01-01', end: '2026-01-31', status: 'approved' },
    { start: '2026-02-01', end: '2026-02-28', status: 'pending' },
    { start: '2026-03-01', end: '2026-03-31', status: 'draft' },
  ];

  let created = 0;
  let seq = 0;

  for (const b of buildings) {
    for (const period of periods) {
      seq += 1;
      const invoiceNumber = `INV-PASA-${b.code}-${String(seq).padStart(3, '0')}`;
      const baseNet = 180000 + seq * 12500;
      const totalNet = baseNet.toFixed(2);
      const taxRate = '0.1900';
      const taxAmount = (baseNet * 0.19).toFixed(2);
      const total = (baseNet * 1.19).toFixed(2);

      const { rows: invRows } = await client.query(
        `INSERT INTO invoices (
           tenant_id, building_id, tariff_id, invoice_number,
           period_start, period_end, status,
           total_net, tax_rate, tax_amount, total, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (tenant_id, invoice_number) DO NOTHING
         RETURNING id`,
        [
          tenantId,
          b.id,
          b.tariff_id,
          invoiceNumber,
          period.start,
          period.end,
          period.status,
          totalNet,
          taxRate,
          taxAmount,
          total,
          createdBy,
        ],
      );

      const invoiceId = invRows[0]?.id;
      if (!invoiceId) {
        continue;
      }

      const { rows: meters } = await client.query(
        `SELECT m.id,
                (SELECT tenant_unit_id FROM tenant_unit_meters tum WHERE tum.meter_id = m.id LIMIT 1) AS tenant_unit_id
         FROM meters m
         WHERE m.tenant_id = $1 AND m.building_id = $2 AND m.is_active = true
         ORDER BY m.code
         LIMIT 8`,
        [tenantId, b.id],
      );

      let lineSeq = 0;
      for (const meter of meters) {
        lineSeq += 1;
        const kwh = (420 + lineSeq * 37.5).toFixed(2);
        const kwMax = (12 + lineSeq * 1.8).toFixed(2);
        const kvarh = (45 + lineSeq * 3.2).toFixed(2);
        const energyCharge = (parseFloat(kwh) * 98.2).toFixed(2);
        const demandCharge = (parseFloat(kwMax) * 8500).toFixed(2);
        const reactiveCharge = (parseFloat(kvarh) * 12.5).toFixed(2);
        const fixedCharge = '45000.00';
        const lineNet = (
          parseFloat(energyCharge) +
          parseFloat(demandCharge) +
          parseFloat(reactiveCharge) +
          parseFloat(fixedCharge)
        ).toFixed(2);

        await client.query(
          `INSERT INTO invoice_line_items (
             invoice_id, meter_id, tenant_unit_id,
             kwh_consumption, kw_demand_max, kvarh_reactive, kwh_exported, net_balance,
             energy_charge, demand_charge, reactive_charge, fixed_charge, total_net
           )
           VALUES ($1, $2, $3, $4, $5, $6, 0, $4, $7, $8, $9, $10, $11)`,
          [
            invoiceId,
            meter.id,
            meter.tenant_unit_id,
            kwh,
            kwMax,
            kvarh,
            energyCharge,
            demandCharge,
            reactiveCharge,
            fixedCharge,
            lineNet,
          ],
        );
      }

      created += 1;
    }
  }

  console.log(`[ok] invoices: ${created} facturas demo con line items`);
  return created;
}

/**
 * Seed voided demo invoices (2 per building) for Anuladas tab visibility.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Voided invoices created
 */
async function seedVoidedInvoices(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM invoices
     WHERE tenant_id = $1 AND invoice_number LIKE 'INV-PASA-VOID-%'`,
    [tenantId],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] voided demo invoices already seeded');
    return 0;
  }

  const { rows: creatorRows } = await client.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.tenant_id = $1 OR r.slug = 'super_admin'
     ORDER BY CASE WHEN u.tenant_id = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [tenantId],
  );
  const createdBy = creatorRows[0]?.id;
  if (!createdBy) {
    console.log('[skip] voided invoices: no user for created_by');
    return 0;
  }

  const { rows: buildings } = await client.query(
    `SELECT b.id, b.code, t.id AS tariff_id
     FROM buildings b
     LEFT JOIN LATERAL (
       SELECT id FROM tariffs
       WHERE tenant_id = b.tenant_id AND building_id = b.id AND is_active = true
       ORDER BY effective_from DESC
       LIMIT 1
     ) t ON true
     WHERE b.tenant_id = $1
     ORDER BY b.code`,
    [tenantId],
  );

  const voidedPeriods = [
    {
      start: '2025-11-01',
      end: '2025-11-30',
      suffix: 'A',
      notes: 'Anulada: tarifa incorrecta aplicada al periodo.',
    },
    {
      start: '2025-12-01',
      end: '2025-12-31',
      suffix: 'B',
      notes: 'Anulada: duplicada con factura corregida del mismo mes.',
    },
  ];

  let created = 0;

  for (const b of buildings) {
    for (const period of voidedPeriods) {
      const invoiceNumber = `INV-PASA-VOID-${b.code}-${period.suffix}`;
      const baseNet = 142000 + b.code.length * 8500;
      const totalNet = baseNet.toFixed(2);
      const taxRate = '0.1900';
      const taxAmount = (baseNet * 0.19).toFixed(2);
      const total = (baseNet * 1.19).toFixed(2);

      const { rows: invRows } = await client.query(
        `INSERT INTO invoices (
           tenant_id, building_id, tariff_id, invoice_number,
           period_start, period_end, status,
           total_net, tax_rate, tax_amount, total, notes, created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'voided', $7, $8, $9, $10, $11, $12)
         ON CONFLICT (tenant_id, invoice_number) DO NOTHING
         RETURNING id`,
        [
          tenantId,
          b.id,
          b.tariff_id,
          invoiceNumber,
          period.start,
          period.end,
          totalNet,
          taxRate,
          taxAmount,
          total,
          period.notes,
          createdBy,
        ],
      );

      const invoiceId = invRows[0]?.id;
      if (!invoiceId) {
        continue;
      }

      const { rows: meters } = await client.query(
        `SELECT m.id,
                (SELECT tenant_unit_id FROM tenant_unit_meters tum WHERE tum.meter_id = m.id LIMIT 1) AS tenant_unit_id
         FROM meters m
         WHERE m.tenant_id = $1 AND m.building_id = $2 AND m.is_active = true
         ORDER BY m.code
         LIMIT 5`,
        [tenantId, b.id],
      );

      let lineSeq = 0;
      for (const meter of meters) {
        lineSeq += 1;
        const kwh = (380 + lineSeq * 29.5).toFixed(2);
        const kwMax = (10 + lineSeq * 1.4).toFixed(2);
        const kvarh = (38 + lineSeq * 2.8).toFixed(2);
        const energyCharge = (parseFloat(kwh) * 98.2).toFixed(2);
        const demandCharge = (parseFloat(kwMax) * 8500).toFixed(2);
        const reactiveCharge = (parseFloat(kvarh) * 12.5).toFixed(2);
        const fixedCharge = '45000.00';
        const lineNet = (
          parseFloat(energyCharge) +
          parseFloat(demandCharge) +
          parseFloat(reactiveCharge) +
          parseFloat(fixedCharge)
        ).toFixed(2);

        await client.query(
          `INSERT INTO invoice_line_items (
             invoice_id, meter_id, tenant_unit_id,
             kwh_consumption, kw_demand_max, kvarh_reactive, kwh_exported, net_balance,
             energy_charge, demand_charge, reactive_charge, fixed_charge, total_net
           )
           VALUES ($1, $2, $3, $4, $5, $6, 0, $4, $7, $8, $9, $10, $11)`,
          [
            invoiceId,
            meter.id,
            meter.tenant_unit_id,
            kwh,
            kwMax,
            kvarh,
            energyCharge,
            demandCharge,
            reactiveCharge,
            fixedCharge,
            lineNet,
          ],
        );
      }

      created += 1;
    }
  }

  console.log(`[ok] voided invoices: ${created} facturas anuladas demo`);
  return created;
}

const DEMO_SEED_EMAIL = 'demo-seed@energymonitor.dev';

/**
 * Resolves a user id for seed rows (tenant user or super_admin fallback).
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<string | null>} User UUID
 */
async function resolveSeedUserId(client, tenantId) {
  const { rows } = await client.query(
    `SELECT u.id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE u.tenant_id = $1 OR r.slug = 'super_admin'
     ORDER BY CASE WHEN u.tenant_id = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [tenantId],
  );
  return rows[0]?.id ?? null;
}

/**
 * Seed generated reports for Reportes table (3 per building + 2 portfolio).
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Reports created
 */
async function seedReports(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM reports
     WHERE tenant_id = $1 AND file_url LIKE 'seed://pasa-reports/%'`,
    [tenantId],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] demo reports already seeded');
    return 0;
  }

  const generatedBy = await resolveSeedUserId(client, tenantId);
  if (!generatedBy) {
    console.log('[skip] reports: no user for generated_by');
    return 0;
  }

  const { rows: buildings } = await client.query(
    `SELECT id, code FROM buildings WHERE tenant_id = $1 ORDER BY code`,
    [tenantId],
  );

  const periods = [
    { start: '2026-01-01', end: '2026-01-31', daysAgo: 45 },
    { start: '2026-02-01', end: '2026-02-28', daysAgo: 25 },
    { start: '2026-03-01', end: '2026-03-31', daysAgo: 8 },
  ];

  const typeFormatPairs = [
    { reportType: 'executive', format: 'pdf', size: 245760 },
    { reportType: 'consumption', format: 'excel', size: 98304 },
    { reportType: 'billing', format: 'csv', size: 32768 },
  ];

  let created = 0;
  let seq = 0;

  for (const b of buildings) {
    for (let i = 0; i < periods.length; i += 1) {
      seq += 1;
      const period = periods[i];
      const spec = typeFormatPairs[i % typeFormatPairs.length];
      const marker = `seed://pasa-reports/${b.code}-${String(seq).padStart(3, '0')}`;

      const { rowCount } = await client.query(
        `INSERT INTO reports (
           tenant_id, building_id, report_type, period_start, period_end,
           format, file_url, file_size_bytes, generated_by, created_at
         )
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - ($10 || ' days')::interval
         WHERE NOT EXISTS (
           SELECT 1 FROM reports WHERE tenant_id = $1 AND file_url = $7
         )`,
        [
          tenantId,
          b.id,
          spec.reportType,
          period.start,
          period.end,
          spec.format,
          marker,
          spec.size + seq * 1024,
          generatedBy,
          String(period.daysAgo),
        ],
      );
      created += rowCount ?? 0;
    }
  }

  const portfolioSpecs = [
    {
      reportType: 'benchmark',
      format: 'pdf',
      period: periods[0],
      marker: 'seed://pasa-reports/portfolio-benchmark',
      size: 512000,
      daysAgo: 30,
    },
    {
      reportType: 'alerts_compliance',
      format: 'excel',
      period: periods[2],
      marker: 'seed://pasa-reports/portfolio-alerts',
      size: 156672,
      daysAgo: 5,
    },
  ];

  for (const spec of portfolioSpecs) {
    const { rowCount } = await client.query(
      `INSERT INTO reports (
         tenant_id, building_id, report_type, period_start, period_end,
         format, file_url, file_size_bytes, generated_by, created_at
       )
       SELECT $1, NULL, $2, $3, $4, $5, $6, $7, $8, NOW() - ($9 || ' days')::interval
       WHERE NOT EXISTS (
         SELECT 1 FROM reports WHERE tenant_id = $1 AND file_url = $6
       )`,
      [
        tenantId,
        spec.reportType,
        spec.period.start,
        spec.period.end,
        spec.format,
        spec.marker,
        spec.size,
        generatedBy,
        String(spec.daysAgo),
      ],
    );
    created += rowCount ?? 0;
  }

  console.log(`[ok] reports: ${created} reportes generados demo`);
  return created;
}

/**
 * Seed scheduled reports for Reportes programados table.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Scheduled reports created
 */
async function seedScheduledReports(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM scheduled_reports
     WHERE tenant_id = $1 AND recipients @> $2::jsonb`,
    [tenantId, JSON.stringify([DEMO_SEED_EMAIL])],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] demo scheduled reports already seeded');
    return 0;
  }

  const createdBy = await resolveSeedUserId(client, tenantId);
  if (!createdBy) {
    console.log('[skip] scheduled reports: no user for created_by');
    return 0;
  }

  const { rows: buildings } = await client.query(
    `SELECT id, code FROM buildings WHERE tenant_id = $1 ORDER BY code`,
    [tenantId],
  );

  const recipients = JSON.stringify([DEMO_SEED_EMAIL, 'operaciones@globepower.cl']);
  const demoRecipientsFilter = JSON.stringify([DEMO_SEED_EMAIL]);

  /**
   * @param {number | null} daysAgo - Days in the past
   * @returns {Date | null}
   */
  const runAtDaysAgo = (daysAgo) => {
    if (daysAgo === null) {
      return null;
    }
    return new Date(Date.now() - daysAgo * 86_400_000);
  };

  /**
   * @param {number | null} daysAhead - Days in the future
   * @returns {Date | null}
   */
  const runAtDaysAhead = (daysAhead) => {
    if (daysAhead === null) {
      return null;
    }
    return new Date(Date.now() + daysAhead * 86_400_000);
  };

  const buildingSchedules = [
    { reportType: 'executive', format: 'pdf', cron: '0 8 1 * *', isActive: true, lastDaysAgo: 28, nextDaysAhead: 3 },
    { reportType: 'consumption', format: 'excel', cron: '0 7 * * 1', isActive: true, lastDaysAgo: 6, nextDaysAhead: 1 },
  ];

  let created = 0;

  for (const b of buildings) {
    for (const spec of buildingSchedules) {
      const { rowCount } = await client.query(
        `INSERT INTO scheduled_reports (
           tenant_id, building_id, report_type, format, cron_expression,
           recipients, is_active, last_run_at, next_run_at, created_by
         )
         SELECT $1::uuid, $2::uuid, $3::varchar, $4::varchar, $5::varchar,
                $6::jsonb, $7::boolean, $8::timestamptz, $9::timestamptz, $10::uuid
         WHERE NOT EXISTS (
           SELECT 1 FROM scheduled_reports
           WHERE tenant_id = $1::uuid AND building_id = $2::uuid
             AND report_type = $3::varchar AND cron_expression = $5::varchar
             AND recipients @> $11::jsonb
         )`,
        [
          tenantId,
          b.id,
          spec.reportType,
          spec.format,
          spec.cron,
          recipients,
          spec.isActive,
          runAtDaysAgo(spec.lastDaysAgo),
          runAtDaysAhead(spec.nextDaysAhead),
          createdBy,
          demoRecipientsFilter,
        ],
      );
      created += rowCount ?? 0;
    }
  }

  const portfolioSchedules = [
    {
      reportType: 'billing',
      format: 'pdf',
      cron: '0 9 5 * *',
      isActive: true,
      lastDaysAgo: 12,
      nextDaysAhead: 18,
    },
    {
      reportType: 'quality',
      format: 'csv',
      cron: '0 6 * * 5',
      isActive: false,
      lastDaysAgo: 20,
      nextDaysAhead: null,
    },
    {
      reportType: 'demand',
      format: 'excel',
      cron: '0 10 15 * *',
      isActive: true,
      lastDaysAgo: 45,
      nextDaysAhead: 7,
    },
  ];

  for (const spec of portfolioSchedules) {
    const { rowCount } = await client.query(
      `INSERT INTO scheduled_reports (
         tenant_id, building_id, report_type, format, cron_expression,
         recipients, is_active, last_run_at, next_run_at, created_by
       )
       SELECT $1::uuid, NULL::uuid, $2::varchar, $3::varchar, $4::varchar,
              $5::jsonb, $6::boolean, $7::timestamptz, $8::timestamptz, $9::uuid
       WHERE NOT EXISTS (
         SELECT 1 FROM scheduled_reports
         WHERE tenant_id = $1::uuid AND building_id IS NULL
           AND report_type = $2::varchar AND cron_expression = $4::varchar
           AND recipients @> $10::jsonb
       )`,
      [
        tenantId,
        spec.reportType,
        spec.format,
        spec.cron,
        recipients,
        spec.isActive,
        runAtDaysAgo(spec.lastDaysAgo),
        runAtDaysAhead(spec.nextDaysAhead),
        createdBy,
        demoRecipientsFilter,
      ],
    );
    created += rowCount ?? 0;
  }

  console.log(`[ok] scheduled reports: ${created} programaciones demo`);
  return created;
}

const DEMO_INTEGRATION_MARKER = 'pasa-integrations-demo';

/**
 * Returns timestamp N hours ago.
 * @param {number} hours - Hours in the past
 * @returns {Date}
 */
function hoursAgo(hours) {
  return new Date(Date.now() - hours * 3_600_000);
}

/**
 * Seed demo integration connectors for Integraciones UI.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Integrations created
 */
async function seedIntegrationsDemo(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM integrations
     WHERE tenant_id = $1 AND config->>'seed' = $2`,
    [tenantId, DEMO_INTEGRATION_MARKER],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] demo integrations already seeded');
    return 0;
  }

  const specs = [
    {
      name: 'Drive PASA — ingest diario',
      integrationType: 'mqtt',
      status: 'active',
      lastSyncHoursAgo: 2,
      errorMessage: null,
      config: {
        seed: DEMO_INTEGRATION_MARKER,
        broker: 'mqtts://ingest.globepower.cl:8883',
        topic: 'pasa/readings/+',
        clientId: 'monitoreo-v2-pasa',
      },
    },
    {
      name: 'API REST — export facturación',
      integrationType: 'api_rest',
      status: 'active',
      lastSyncHoursAgo: 6,
      errorMessage: null,
      config: {
        seed: DEMO_INTEGRATION_MARKER,
        baseUrl: 'https://api.globepower.cl/v1',
        authType: 'bearer',
        syncIntervalMinutes: 60,
      },
    },
    {
      name: 'FTP respaldo lecturas',
      integrationType: 'ftp',
      status: 'inactive',
      lastSyncHoursAgo: 72,
      errorMessage: null,
      config: {
        seed: DEMO_INTEGRATION_MARKER,
        host: 'ftp.globepower.cl',
        path: '/backup/pasa',
        passive: true,
      },
    },
    {
      name: 'BACnet — Mall MG',
      integrationType: 'bacnet',
      status: 'error',
      lastSyncHoursAgo: 26,
      errorMessage: 'Timeout en lectura dispositivo 192.168.10.42:47808',
      config: {
        seed: DEMO_INTEGRATION_MARKER,
        host: '192.168.10.42',
        port: 47808,
        deviceId: 1001,
      },
    },
  ];

  let created = 0;
  for (const spec of specs) {
    const { rowCount } = await client.query(
      `INSERT INTO integrations (
         tenant_id, name, integration_type, status, config,
         last_sync_at, error_message
       )
       SELECT $1::uuid, $2::varchar, $3::varchar, $4::varchar, $5::jsonb,
              $6::timestamptz, $7::text
       WHERE NOT EXISTS (
         SELECT 1 FROM integrations
         WHERE tenant_id = $1::uuid AND name = $2::varchar
       )`,
      [
        tenantId,
        spec.name,
        spec.integrationType,
        spec.status,
        JSON.stringify(spec.config),
        hoursAgo(spec.lastSyncHoursAgo),
        spec.errorMessage,
      ],
    );
    created += rowCount ?? 0;
  }

  console.log(`[ok] integrations: ${created} conectores demo`);
  return created;
}

/**
 * Seed sync history rows for demo integrations.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Log rows created
 */
async function seedIntegrationSyncLogsDemo(client, tenantId) {
  const { rows: integrations } = await client.query(
    `SELECT id, name, status FROM integrations
     WHERE tenant_id = $1 AND config->>'seed' = $2
     ORDER BY name`,
    [tenantId, DEMO_INTEGRATION_MARKER],
  );
  if (integrations.length === 0) {
    console.log('[skip] integration sync logs: no demo integrations');
    return 0;
  }

  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n
     FROM integration_sync_logs isl
     JOIN integrations i ON i.id = isl.integration_id
     WHERE i.tenant_id = $1 AND i.config->>'seed' = $2`,
    [tenantId, DEMO_INTEGRATION_MARKER],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] integration sync logs already seeded');
    return 0;
  }

  const logSpecs = [
    { status: 'success', recordsSynced: 1840, hoursAgoStart: 2, durationMin: 4, error: null },
    { status: 'success', recordsSynced: 1795, hoursAgoStart: 26, durationMin: 5, error: null },
    { status: 'partial', recordsSynced: 920, hoursAgoStart: 50, durationMin: 6, error: '3 medidores sin respuesta' },
    { status: 'failed', recordsSynced: 0, hoursAgoStart: 74, durationMin: 2, error: 'Connection refused' },
  ];

  let created = 0;
  for (const integration of integrations) {
    for (const spec of logSpecs) {
      const startedAt = hoursAgo(spec.hoursAgoStart);
      const completedAt = new Date(startedAt.getTime() + spec.durationMin * 60_000);
      await client.query(
        `INSERT INTO integration_sync_logs (
           integration_id, status, records_synced, error_message,
           started_at, completed_at, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [
          integration.id,
          spec.status,
          spec.recordsSynced,
          spec.error,
          startedAt,
          completedAt,
        ],
      );
      created += 1;
    }
  }

  console.log(`[ok] integration sync logs: ${created} filas demo`);
  return created;
}

/**
 * Seed outbound webhook subscriptions for Integraciones → Webhooks tab.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Subscriptions created
 */
async function seedWebhookSubscriptionsDemo(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM webhook_subscriptions
     WHERE tenant_id = $1 AND url LIKE 'https://demo-seed.%'`,
    [tenantId],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] webhook subscriptions already seeded');
    return 0;
  }

  const specs = [
    { eventType: 'alert.created', url: 'https://demo-seed.globepower.cl/webhooks/alerts', active: true },
    { eventType: 'meter.offline', url: 'https://demo-seed.globepower.cl/webhooks/meters', active: true },
    { eventType: 'gap.detected', url: 'https://demo-seed.globepower.cl/webhooks/gaps', active: false },
  ];

  let created = 0;
  for (const spec of specs) {
    const { rowCount } = await client.query(
      `INSERT INTO webhook_subscriptions (tenant_id, event_type, url, secret, active)
       SELECT $1::uuid, $2::webhook_event_type, $3::text, $4::text, $5::boolean
       WHERE NOT EXISTS (
         SELECT 1 FROM webhook_subscriptions
         WHERE tenant_id = $1::uuid AND event_type = $2::webhook_event_type AND url = $3::text
       )`,
      [tenantId, spec.eventType, spec.url, 'demo-webhook-secret-seed', spec.active],
    );
    created += rowCount ?? 0;
  }

  console.log(`[ok] webhook subscriptions: ${created} suscripciones demo`);
  return created;
}

/**
 * Seed webhook delivery logs (last 24h) for health + deliveries tabs.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Delivery rows created
 */
async function seedWebhookDeliveriesDemo(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM webhook_delivery_logs
     WHERE tenant_id = $1 AND url LIKE 'https://demo-seed.%'`,
    [tenantId],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] webhook delivery logs already seeded');
    return 0;
  }

  const { rows: subs } = await client.query(
    `SELECT id, event_type, url FROM webhook_subscriptions
     WHERE tenant_id = $1 AND url LIKE 'https://demo-seed.%'`,
    [tenantId],
  );
  if (subs.length === 0) {
    console.log('[skip] webhook deliveries: no demo subscriptions');
    return 0;
  }

  let created = 0;
  for (const sub of subs) {
    const attempts = [
      { status: 'sent', httpStatus: 200, hoursAgo: 1, error: null },
      { status: 'sent', httpStatus: 204, hoursAgo: 5, error: null },
      { status: 'failed', httpStatus: 503, hoursAgo: 12, error: 'Service Unavailable' },
      { status: 'sent', httpStatus: 200, hoursAgo: 20, error: null },
    ];
    for (const attempt of attempts) {
      const createdAt = hoursAgo(attempt.hoursAgo);
      await client.query(
        `INSERT INTO webhook_delivery_logs (
           tenant_id, subscription_id, event_type, url, status,
           http_status, attempt_count, error_message, payload, created_at
         ) VALUES ($1, $2, $3::webhook_event_type, $4, $5, $6, 1, $7, $8::jsonb, $9)`,
        [
          tenantId,
          sub.id,
          sub.event_type,
          sub.url,
          attempt.status,
          attempt.httpStatus,
          attempt.error,
          JSON.stringify({ demo: true, event: sub.event_type }),
          createdAt,
        ],
      );
      created += 1;
    }
  }

  console.log(`[ok] webhook delivery logs: ${created} entregas demo`);
  return created;
}

/**
 * Seed ingest gaps (open + resolved) for brechas tab.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Gaps created
 */
async function seedIngestGapsDemo(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM ingest_gaps WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] ingest_gaps already populated');
    return 0;
  }

  const { rows: meters } = await client.query(
    `SELECT id FROM meters WHERE tenant_id = $1 ORDER BY code LIMIT 4`,
    [tenantId],
  );
  if (meters.length === 0) {
    console.log('[skip] ingest_gaps: no meters');
    return 0;
  }

  const gapSpecs = [
    { meterIdx: 0, gapStartHours: 48, gapEndHours: 46, status: 'open', resolvedHoursAgo: null },
    { meterIdx: 1, gapStartHours: 120, gapEndHours: 118, status: 'open', resolvedHoursAgo: null },
    { meterIdx: 2, gapStartHours: 240, gapEndHours: 236, status: 'resolved', resolvedHoursAgo: 200 },
    { meterIdx: 3, gapStartHours: 360, gapEndHours: 355, status: 'resolved', resolvedHoursAgo: 300 },
  ];

  let created = 0;
  for (const spec of gapSpecs) {
    const meterId = meters[spec.meterIdx % meters.length].id;
    const gapStart = hoursAgo(spec.gapStartHours);
    const gapEnd = hoursAgo(spec.gapEndHours);
    const resolvedAt = spec.resolvedHoursAgo != null ? hoursAgo(spec.resolvedHoursAgo) : null;
    await client.query(
      `INSERT INTO ingest_gaps (
         tenant_id, meter_id, gap_start, gap_end, detected_at, resolved_at, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::ingest_gap_status)`,
      [
        tenantId,
        meterId,
        gapStart,
        gapEnd,
        hoursAgo(spec.gapStartHours - 1),
        resolvedAt,
        spec.status,
      ],
    );
    created += 1;
  }

  console.log(`[ok] ingest_gaps: ${created} brechas demo`);
  return created;
}

/**
 * Seed backfill jobs for backfill tab.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 * @returns {Promise<number>} Jobs created
 */
async function seedBackfillJobsDemo(client, tenantId) {
  const { rows: existing } = await client.query(
    `SELECT COUNT(*)::int AS n FROM backfill_jobs WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!FORCE && existing[0].n > 0) {
    console.log('[skip] backfill_jobs already populated');
    return 0;
  }

  const { rows: meters } = await client.query(
    `SELECT id FROM meters WHERE tenant_id = $1 ORDER BY code LIMIT 3`,
    [tenantId],
  );
  if (meters.length === 0) {
    console.log('[skip] backfill_jobs: no meters');
    return 0;
  }

  const jobSpecs = [
    {
      meterIdx: 0,
      fromHours: 168,
      toHours: 120,
      status: 'completed',
      rowsInserted: 4520,
      error: null,
    },
    {
      meterIdx: 1,
      fromHours: 336,
      toHours: 300,
      status: 'failed',
      rowsInserted: 0,
      error: 'Fuente FTP no disponible',
    },
    {
      meterIdx: 2,
      fromHours: 72,
      toHours: 48,
      status: 'pending',
      rowsInserted: 0,
      error: null,
    },
  ];

  let created = 0;
  for (const spec of jobSpecs) {
    await client.query(
      `INSERT INTO backfill_jobs (
         tenant_id, meter_id, from_ts, to_ts, status, rows_inserted, error
       ) VALUES ($1, $2, $3, $4, $5::backfill_job_status, $6, $7)`,
      [
        tenantId,
        meters[spec.meterIdx].id,
        hoursAgo(spec.fromHours),
        hoursAgo(spec.toHours),
        spec.status,
        spec.rowsInserted,
        spec.error,
      ],
    );
    created += 1;
  }

  console.log(`[ok] backfill_jobs: ${created} jobs demo`);
  return created;
}

/**
 * Print row counts for seeded entities.
 * @param {import('pg').Client} client - DB client
 * @param {string} tenantId - Tenant UUID
 */
async function printSummary(client, tenantId) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM tenant_units WHERE tenant_id = $1) AS tenant_units,
       (SELECT COUNT(*)::int FROM tariffs WHERE tenant_id = $1) AS tariffs,
       (SELECT COUNT(*)::int FROM building_hierarchy WHERE tenant_id = $1) AS hierarchy_nodes,
       (SELECT COUNT(*)::int FROM meter_hierarchy mh JOIN meters m ON m.id = mh.meter_id WHERE m.tenant_id = $1) AS meter_hierarchy,
       (SELECT COUNT(*)::int FROM concentrators WHERE tenant_id = $1) AS concentrators,
       (SELECT COUNT(*)::int FROM alert_rules WHERE tenant_id = $1) AS alert_rules,
       (SELECT COUNT(*)::int FROM invoices WHERE tenant_id = $1) AS invoices,
       (SELECT COUNT(*)::int FROM invoices WHERE tenant_id = $1 AND status = 'voided') AS invoices_voided,
       (SELECT COUNT(*)::int FROM invoice_line_items li JOIN invoices i ON i.id = li.invoice_id WHERE i.tenant_id = $1) AS invoice_line_items,
       (SELECT COUNT(*)::int FROM reports WHERE tenant_id = $1) AS reports,
       (SELECT COUNT(*)::int FROM reports WHERE tenant_id = $1 AND file_url LIKE 'seed://pasa-reports/%') AS reports_demo,
       (SELECT COUNT(*)::int FROM scheduled_reports WHERE tenant_id = $1) AS scheduled_reports,
       (SELECT COUNT(*)::int FROM scheduled_reports WHERE tenant_id = $1 AND recipients @> $2::jsonb) AS scheduled_reports_demo,
       (SELECT COUNT(*)::int FROM integrations WHERE tenant_id = $1) AS integrations,
       (SELECT COUNT(*)::int FROM integrations WHERE tenant_id = $1 AND config->>'seed' = $3) AS integrations_demo,
       (SELECT COUNT(*)::int FROM integration_sync_logs isl
        JOIN integrations i ON i.id = isl.integration_id
        WHERE i.tenant_id = $1 AND i.config->>'seed' = $3) AS integration_sync_logs_demo,
       (SELECT COUNT(*)::int FROM webhook_subscriptions WHERE tenant_id = $1) AS webhook_subscriptions,
       (SELECT COUNT(*)::int FROM webhook_delivery_logs WHERE tenant_id = $1) AS webhook_delivery_logs,
       (SELECT COUNT(*)::int FROM ingest_gaps WHERE tenant_id = $1) AS ingest_gaps,
       (SELECT COUNT(*)::int FROM backfill_jobs WHERE tenant_id = $1) AS backfill_jobs`,
    [tenantId, JSON.stringify([DEMO_SEED_EMAIL]), DEMO_INTEGRATION_MARKER],
  );
  console.log('\nSummary:', rows[0]);
}

const client = await connectDb();
try {
  const tenantId = await resolveTenantId(client);
  console.log(`Tenant ${TENANT_SLUG} → ${tenantId}\n`);

  await client.query('BEGIN');
  await seedTenantUnits(client, tenantId);
  await seedTariffs(client, tenantId);
  await seedHierarchy(client, tenantId);
  await seedConcentrators(client, tenantId);
  await seedAlertRules(client, tenantId);
  await seedInvoices(client, tenantId);
  await seedVoidedInvoices(client, tenantId);
  await seedReports(client, tenantId);
  await seedScheduledReports(client, tenantId);
  await seedIntegrationsDemo(client, tenantId);
  await seedIntegrationSyncLogsDemo(client, tenantId);
  await seedWebhookSubscriptionsDemo(client, tenantId);
  await seedWebhookDeliveriesDemo(client, tenantId);
  await seedIngestGapsDemo(client, tenantId);
  await seedBackfillJobsDemo(client, tenantId);
  await client.query('COMMIT');

  await printSummary(client, tenantId);
} catch (err) {
  await client.query('ROLLBACK');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
