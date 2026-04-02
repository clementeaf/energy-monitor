#!/usr/bin/env node
/**
 * Lee XLSX de facturación desde S3 (prefijo billing/) e inserta en billing_monthly_detail,
 * billing_tariffs y billing_center_summary.
 *
 * Uso: node index.mjs
 *      Procesa todos los .xlsx bajo S3_BUCKET/S3_PREFIX (default billing/).
 *      DB: env (DB_HOST, DB_NAME, DB_USERNAME, DB_PASSWORD) o Secrets Manager.
 *      Invocable como Lambda: event.opcional { bucket, key } para un solo archivo.
 */

import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const S3_PREFIX = process.env.S3_PREFIX || 'billing';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);

const s3 = new S3Client({ region: REGION });

function norm(s) {
  if (s == null || typeof s !== 'string') return '';
  return s.replace(/\r\n/g, ' ').trim();
}

function parseNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractYearFromFilename(filename) {
  const m = filename.match(/20\d{2}/);
  return m ? parseInt(m[0], 10) : new Date().getFullYear();
}

function configFromEnv() {
  const host = process.env.DB_HOST;
  const database = process.env.DB_NAME || process.env.DATABASE_NAME;
  const user = process.env.DB_USERNAME || process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (host && database && user && password) {
    return {
      host,
      port: Number(process.env.DB_PORT || 5432),
      database,
      user,
      password,
      ssl: process.env.DB_SSL !== 'false' ? getPgSslOptionsForRds() : false,
    };
  }
  return null;
}

async function getDbConfig() {
  const config = configFromEnv();
  if (config) return config;
  const sm = new SecretsManagerClient({ region: REGION });
  const res = await sm.send(new GetSecretValueCommand({ SecretId: DB_SECRET_NAME }));
  if (!res.SecretString) throw new Error(`Secret ${DB_SECRET_NAME} has no SecretString`);
  const secret = JSON.parse(res.SecretString);
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: secret.dbname || secret.database || secret.DB_NAME,
    user: secret.username || secret.user || secret.DB_USERNAME,
    password: secret.password || secret.DB_PASSWORD,
    ssl: getPgSslOptionsForRds(),
  };
}

async function listS3Keys(bucket, prefix) {
  const keys = [];
  let continuationToken;
  do {
    const cmd = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix.endsWith('/') ? prefix : prefix + '/',
    });
    if (continuationToken) cmd.input.ContinuationToken = continuationToken;
    const out = await s3.send(cmd);
    for (const o of out.Contents || []) {
      if (o.Key && o.Key.toLowerCase().endsWith('.xlsx')) keys.push(o.Key);
    }
    continuationToken = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys.sort();
}

async function getS3Body(bucket, key) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function findHeaderRow(rows, marker, marker2) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    const line = row.map((c) => norm(String(c))).join(' ');
    if (line.includes(marker)) return i;
    if (marker2 && line.includes(marker2)) return i;
  }
  return -1;
}

/** Finds first row that contains all of the given markers (e.g. Mes and Consumo Total). */
function findHeaderRowWithAll(rows, markers) {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] || [];
    const line = row.map((c) => norm(String(c))).join(' ');
    if (markers.every((m) => line.includes(norm(m)))) return i;
  }
  return -1;
}

function colIndex(headerRow, headerNames) {
  const map = {};
  const row = headerRow || [];
  for (let j = 0; j < row.length; j++) {
    const h = norm(String(row[j]));
    if (!h) continue;
    for (const name of headerNames) {
      const n = norm(name);
      if (h.includes(n) || n.includes(h)) {
        map[name] = j;
        break;
      }
    }
  }
  return (name) => (map[name] != null ? map[name] : -1);
}

async function processResumenMensual(client, rows, year, sourceFile) {
  let headerRowIdx = findHeaderRow(rows, 'ID Medidor', 'Ubicación');
  if (headerRowIdx < 0) headerRowIdx = findHeaderRow(rows, 'N° Mes', 'Mes');
  if (headerRowIdx < 0) return 0;
  const headers = rows[headerRowIdx] || [];
  const col = colIndex(headers, [
    'Mes', 'N° Mes', 'Ubicación', 'ID Medidor', 'Tipo Local', 'Nombre Local', 'Fase',
    'Consumo Mensual', 'Peak Mensual', 'Demanda Hora', 'Punta', '% Punta',
    'Promedio', 'Diario', 'Consumo Energía', 'Dda. Máx. Suministrada', 'Dda. Máx. Hora Punta',
    'KWH para Sistema Troncal', 'KWH para Serv. Público', 'Cargo Fijo', 'Total Neto', 'IVA', 'Monto Exento',
    'Total con IVA', 'Total Con IVA', 'Monto Total con IVA', 'Total + IVA', 'Total IVA',
  ]);
  const idx = (name) => {
    if (name === 'N° Mes' || name === 'month') return col('N° Mes') >= 0 ? col('N° Mes') : col('Mes');
    if (name === 'Ubicación') return col('Ubicación');
    if (name === 'ID Medidor') return col('ID Medidor');
    if (name === 'Tipo Local') return col('Tipo Local');
    if (name === 'Nombre Local') return col('Nombre Local');
    if (name === 'Fase') return col('Fase');
    if (name === 'Consumo Mensual') return col('Consumo Mensual');
    if (name === 'Peak Mensual') return col('Peak Mensual');
    if (name === 'Demanda Hora' || name === 'Punta') return col('Demanda Hora') >= 0 ? col('Demanda Hora') : col('Punta');
    if (name === '% Punta') return col('% Punta');
    if (name === 'Promedio' || name === 'Diario') return col('Promedio') >= 0 ? col('Promedio') : col('Diario');
    if (name === 'Consumo Energía') return col('Consumo Energía');
    if (name === 'Dda. Máx. Suministrada') return col('Dda. Máx. Suministrada');
    if (name === 'Dda. Máx. Hora Punta') return col('Dda. Máx. Hora Punta');
    if (name === 'KWH para Sistema Troncal') return col('KWH para Sistema Troncal');
    if (name === 'KWH para Serv. Público') return col('KWH para Serv. Público');
    if (name === 'Cargo Fijo') return col('Cargo Fijo');
    if (name === 'Total Neto') return col('Total Neto');
    if (name === 'IVA') return col('IVA');
    if (name === 'Monto Exento') return col('Monto Exento');
    if (name === 'Total con IVA') {
      const a = col('Total con IVA');
      if (a >= 0) return a;
      const b = col('Total Con IVA');
      if (b >= 0) return b;
      const c = col('Monto Total con IVA');
      if (c >= 0) return c;
      const d = col('Total + IVA');
      if (d >= 0) return d;
      return col('Total IVA');
    }
    return -1;
  };
  const iMonth = idx('month') >= 0 ? idx('month') : idx('Mes');
  const iCenter = idx('Ubicación');
  const iMeter = idx('ID Medidor');
  if (iCenter < 0 || iMeter < 0) return 0;

  let inserted = 0;
  const dataRows = rows.slice(headerRowIdx + 1);
  for (let off = 0; off < dataRows.length; off += BATCH_SIZE) {
    const batch = dataRows.slice(off, off + BATCH_SIZE);
    const values = [];
    const params = [];
    let p = 1;
    for (const row of batch) {
      const center = norm(row[iCenter]);
      const meterId = norm(row[iMeter]);
      const month = parseNum(row[iMonth]) ?? parseNum(row[col('Mes')]);
      if (!center || !meterId || !month || month < 1 || month > 12) continue;
      params.push(
        center, year, month, meterId,
        row[idx('Tipo Local')] != null ? norm(String(row[idx('Tipo Local')])) : null,
        row[idx('Nombre Local')] != null ? norm(String(row[idx('Nombre Local')])) : null,
        row[idx('Fase')] != null ? norm(String(row[idx('Fase')])) : null,
        parseNum(row[idx('Consumo Mensual')]),
        parseNum(row[idx('Peak Mensual')]),
        parseNum(row[idx('Demanda Hora')]),
        parseNum(row[idx('% Punta')]),
        parseNum(row[idx('Promedio')]),
        parseNum(row[idx('Consumo Energía')]),
        parseNum(row[idx('Dda. Máx. Suministrada')]),
        parseNum(row[idx('Dda. Máx. Hora Punta')]),
        parseNum(row[idx('KWH para Sistema Troncal')]),
        parseNum(row[idx('KWH para Serv. Público')]),
        parseNum(row[idx('Cargo Fijo')]),
        parseNum(row[idx('Total Neto')]),
        parseNum(row[idx('IVA')]),
        parseNum(row[idx('Monto Exento')]),
        parseNum(row[idx('Total con IVA')]),
        sourceFile,
      );
      values.push(`(${Array.from({ length: 23 }, () => `$${p++}`).join(',')})`);
    }
    if (values.length === 0) continue;
    const sql = `
      INSERT INTO billing_monthly_detail (
        center_name, year, month, meter_id, store_type, store_name, phase,
        consumption_kwh, peak_kw, demand_punta_kwh, pct_punta, avg_daily_kwh,
        energy_charge_clp, demand_max_kw, demand_punta_kw, kwh_troncal, kwh_servicio_publico,
        fixed_charge_clp, total_net_clp, iva_clp, exempt_amount, total_with_iva_clp, source_file
      ) VALUES ${values.join(',')}
      ON CONFLICT (center_name, year, month, meter_id) DO UPDATE SET
        store_type = EXCLUDED.store_type, store_name = EXCLUDED.store_name, phase = EXCLUDED.phase,
        consumption_kwh = EXCLUDED.consumption_kwh, peak_kw = EXCLUDED.peak_kw,
        demand_punta_kwh = EXCLUDED.demand_punta_kwh, pct_punta = EXCLUDED.pct_punta,
        avg_daily_kwh = EXCLUDED.avg_daily_kwh, energy_charge_clp = EXCLUDED.energy_charge_clp,
        demand_max_kw = EXCLUDED.demand_max_kw, demand_punta_kw = EXCLUDED.demand_punta_kw,
        kwh_troncal = EXCLUDED.kwh_troncal, kwh_servicio_publico = EXCLUDED.kwh_servicio_publico,
        fixed_charge_clp = EXCLUDED.fixed_charge_clp, total_net_clp = EXCLUDED.total_net_clp,
        iva_clp = EXCLUDED.iva_clp, exempt_amount = EXCLUDED.exempt_amount,
        total_with_iva_clp = EXCLUDED.total_with_iva_clp, source_file = EXCLUDED.source_file
    `;
    await client.query(sql, params);
    inserted += batch.length;
  }
  return inserted;
}

async function processPliegos(client, rows, tariffName, year, sourceFile) {
  if (rows.length < 2) return 0;
  const headers = (rows[0] || []).map((h) => norm(String(h)));
  const iMonth = headers.findIndex((h) => h.includes('Mes') || h === 'Mes' || h === 'N°');
  const col = (name) => {
    const i = headers.findIndex((h) => h.includes(name) || name.includes(h));
    return i >= 0 ? i : -1;
  };
  const iConsumo = col('Consumo Energía') >= 0 ? col('Consumo Energía') : 1;
  const iDdaMax = col('Dda. Máx. Suministrada') >= 0 ? col('Dda. Máx. Suministrada') : 2;
  const iDdaPunta = col('Dda. Máx. Hora Punta') >= 0 ? col('Dda. Máx. Hora Punta') : 3;
  const iTroncal = col('KWH para Sistema Troncal') >= 0 ? col('KWH para Sistema Troncal') : 4;
  const iCargo = col('Cargo Fijo') >= 0 ? col('Cargo Fijo') : 10;
  let inserted = 0;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const month = iMonth >= 0 ? parseNum(row[iMonth]) : r;
    if (!month || month < 1 || month > 12) continue;
    await client.query(
      `INSERT INTO billing_tariffs (
        tariff_name, year, month, consumption_energy_kwh, demand_max_kw, demand_punta_kw,
        kwh_troncal, kwh_serv_iva_1, kwh_serv_iva_2, kwh_serv_iva_3, kwh_serv_iva_4, kwh_serv_iva_5,
        fixed_charge_clp, source_file
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (tariff_name, year, month) DO UPDATE SET
        consumption_energy_kwh = EXCLUDED.consumption_energy_kwh, demand_max_kw = EXCLUDED.demand_max_kw,
        demand_punta_kw = EXCLUDED.demand_punta_kw, kwh_troncal = EXCLUDED.kwh_troncal,
        kwh_serv_iva_1 = EXCLUDED.kwh_serv_iva_1, kwh_serv_iva_2 = EXCLUDED.kwh_serv_iva_2,
        kwh_serv_iva_3 = EXCLUDED.kwh_serv_iva_3, kwh_serv_iva_4 = EXCLUDED.kwh_serv_iva_4,
        kwh_serv_iva_5 = EXCLUDED.kwh_serv_iva_5, fixed_charge_clp = EXCLUDED.fixed_charge_clp,
        source_file = EXCLUDED.source_file`,
      [
        tariffName, year, month,
        parseNum(row[iConsumo]),
        parseNum(row[iDdaMax]),
        parseNum(row[iDdaPunta]),
        parseNum(row[iTroncal]),
        parseNum(row[5]),
        parseNum(row[6]),
        parseNum(row[7]),
        parseNum(row[8]),
        parseNum(row[9]),
        parseNum(row[iCargo]),
        sourceFile,
      ],
    );
    inserted++;
  }
  return inserted;
}

async function processResumenEjecutivo(client, rows, centerName, year, sourceFile) {
  let headerRowIdx = findHeaderRowWithAll(rows, ['Mes', 'Consumo Total']);
  if (headerRowIdx < 0) headerRowIdx = findHeaderRowWithAll(rows, ['N° Mes', 'Peak Máx']);
  if (headerRowIdx < 0) headerRowIdx = findHeaderRow(rows, 'Consumo Total', 'Centro (kWh)');
  if (headerRowIdx < 0) headerRowIdx = findHeaderRow(rows, 'Peak Máx', 'N° Mes');
  if (headerRowIdx < 0) return 0;
  const headers = rows[headerRowIdx] || [];
  const headerCandidates = [
    'Mes', 'N° Mes',
    'Consumo Total', 'Consumo Total Centro (kWh)',
    'Peak Máx', 'Peak Máx Centro (kW)',
    'Demanda Punta', 'Demanda Punta Total (kWh)',
    '% Punta',
    'Promedio Diario', 'Promedio Diario Centro (kWh)', 'Promedio',
    'Local con Mayor', 'Local con Mayor Consumo',
  ];
  const col = colIndex(headers, headerCandidates);
  const iMonth = col('N° Mes') >= 0 ? col('N° Mes') : col('Mes');
  const iTotal = col('Consumo Total') >= 0 ? col('Consumo Total') : col('Consumo Total Centro (kWh)');
  const iPeak = col('Peak Máx') >= 0 ? col('Peak Máx') : col('Peak Máx Centro (kW)');
  const iDemand = col('Demanda Punta') >= 0 ? col('Demanda Punta') : col('Demanda Punta Total (kWh)');
  const iPct = col('% Punta');
  const iAvg = col('Promedio Diario') >= 0 ? col('Promedio Diario') : (col('Promedio Diario Centro (kWh)') >= 0 ? col('Promedio Diario Centro (kWh)') : col('Promedio'));
  const iTop = col('Local con Mayor') >= 0 ? col('Local con Mayor') : col('Local con Mayor Consumo');
  if (iTotal < 0) return 0;

  let inserted = 0;
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const month = parseNum(row[iMonth]) ?? parseNum(row[col('Mes')]);
    if (!month || month < 1 || month > 12) continue;
    await client.query(
      `INSERT INTO billing_center_summary (
        center_name, year, month, total_consumption_kwh, peak_max_kw, demand_punta_kwh,
        pct_punta, avg_daily_kwh, top_consumer_local, source_file
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (center_name, year, month) DO UPDATE SET
        total_consumption_kwh = EXCLUDED.total_consumption_kwh, peak_max_kw = EXCLUDED.peak_max_kw,
        demand_punta_kwh = EXCLUDED.demand_punta_kwh, pct_punta = EXCLUDED.pct_punta,
        avg_daily_kwh = EXCLUDED.avg_daily_kwh, top_consumer_local = EXCLUDED.top_consumer_local,
        source_file = EXCLUDED.source_file`,
      [
        centerName, year, month,
        parseNum(row[iTotal]),
        parseNum(row[iPeak]),
        parseNum(row[iDemand]),
        parseNum(row[iPct]),
        parseNum(row[iAvg]),
        row[iTop] != null ? norm(String(row[iTop])) : null,
        sourceFile,
      ],
    );
    inserted++;
  }
  return inserted;
}

function extractCenterFromTitle(row0) {
  if (!row0 || !row0[0]) return '';
  const s = String(row0[0]).trim();
  const pipe = s.indexOf('|');
  return (pipe > 0 ? s.slice(0, pipe) : s).trim();
}

async function processWorkbook(client, wb, sourceFile, year) {
  let detailRows = 0;
  let tariffRows = 0;
  let summaryRows = 0;
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    if (rows.length === 0) continue;
    if (sheetName === 'Resumen Mensual') {
      detailRows += await processResumenMensual(client, rows, year, sourceFile);
    } else if (sheetName.startsWith('Pliegos Tarifarios (')) {
      const m = sheetName.match(/Pliegos Tarifarios \((.+)\)/);
      const tariffName = m ? m[1].trim() : sheetName;
      tariffRows += await processPliegos(client, rows, tariffName, year, sourceFile);
    } else if (sheetName === 'Resumen Ejecutivo') {
      const centerName = extractCenterFromTitle(rows[0]);
      if (centerName) summaryRows += await processResumenEjecutivo(client, rows, centerName, year, sourceFile);
    }
  }
  return { detailRows, tariffRows, summaryRows };
}

async function run(keysToProcess) {
  const dbConfig = await getDbConfig();
  const client = new pg.Client(dbConfig);
  await client.connect();
  let totalDetail = 0;
  let totalTariff = 0;
  let totalSummary = 0;
  try {
    for (const key of keysToProcess) {
      const sourceFile = key.split('/').pop() || key;
      const year = extractYearFromFilename(sourceFile);
      console.error(`Processing ${key} (year=${year})...`);
      const body = await getS3Body(S3_BUCKET, key);
      const wb = XLSX.read(body, { type: 'buffer', cellDates: true });
      const { detailRows, tariffRows, summaryRows } = await processWorkbook(client, wb, sourceFile, year);
      totalDetail += detailRows;
      totalTariff += tariffRows;
      totalSummary += summaryRows;
      console.error(`  detail=${detailRows} tariff=${tariffRows} summary=${summaryRows}`);
    }
  } finally {
    await client.end();
  }
  return { totalDetail, totalTariff, totalSummary };
}

async function main() {
  const args = process.argv.slice(2);
  const oneFile = args.includes('--one');
  let keys;
  if (process.env.S3_KEY) {
    keys = [process.env.S3_KEY];
  } else if (oneFile) {
    const list = await listS3Keys(S3_BUCKET, S3_PREFIX);
    keys = list.length > 0 ? [list[0]] : [];
  } else {
    keys = await listS3Keys(S3_BUCKET, S3_PREFIX);
  }
  if (keys.length === 0) {
    console.error('No .xlsx keys found under', S3_PREFIX);
    process.exit(1);
  }
  console.error('Keys to process:', keys.length);
  const result = await run(keys);
  console.error('Done.', result);
  if (typeof process.env.LAMBDA_TASK_ROOT !== 'undefined') {
    return result;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
