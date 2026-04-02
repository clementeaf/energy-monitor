#!/usr/bin/env node
/**
 * Diagnóstico directo a RDS: meter_ids del subárbol de un nodo y conteos en
 * readings / readings_import_staging para el rango from-to. Explica por qué
 * el gráfico "kWh por nodo" del drill-down puede salir vacío.
 *
 * Requiere acceso a RDS (túnel SSH o ejecución en VPC). Credenciales por .env
 * o por AWS Secrets Manager (mismas credenciales que AWS CLI).
 *
 * Uso:
 *   NODE_ID=B-arauco-estaci-n FROM=2026-03-06 TO=2026-03-13 node hierarchy-consumption-debug.mjs
 *   DB_USE_SECRET=1 DB_HOST=127.0.0.1 DB_PORT=5433 NODE_ID=B-arauco-estaci-n FROM=2026-03-06 TO=2026-03-13 node hierarchy-consumption-debug.mjs
 *
 * Con AWS CLI ya configurado (aws configure), DB_USE_SECRET=1 obtiene el
 * secreto de Secrets Manager y se conecta a RDS (usar túnel si es necesario).
 */

import dotenv from 'dotenv';
import { getPgSslOptionsForRds } from '../lib/rds-ssl.mjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, '../../backend/.env') });

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';

function useLocalCredentials() {
  if (process.env.DB_USE_SECRET === '1') return false;
  const user = process.env.DB_USER || process.env.DB_USERNAME;
  const pass = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  return Boolean(host && user && pass);
}

async function getSecretJson(secretId) {
  const client = new SecretsManagerClient({ region: REGION });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) throw new Error(`Secret ${secretId} has no SecretString`);
  return JSON.parse(response.SecretString);
}

function buildDbConfig(secret, secretOnly = false) {
  const useSsl = process.env.DB_SSL !== 'false';
  const base = {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: process.env.DB_NAME || secret.dbname || secret.database || secret.DB_NAME,
    user: secretOnly ? (secret.username || secret.user || secret.DB_USERNAME) : (process.env.DB_USER || process.env.DB_USERNAME || secret.username || secret.user || secret.DB_USERNAME),
    password: secretOnly ? (secret.password || secret.DB_PASSWORD) : (process.env.DB_PASSWORD || secret.password || secret.DB_PASSWORD),
    ssl: useSsl ? getPgSslOptionsForRds() : false,
  };
  return secretOnly ? base : { ...base, user: base.user, password: base.password };
}

/**
 * Resuelve nodeId al id usado en BD (ej. B-ARAUCO-ESTACI-N -> B-arauco-estaci-n).
 */
async function resolveNodeId(client, nodeId) {
  const rows = await client.query(`SELECT id FROM hierarchy_nodes WHERE id = $1 LIMIT 1`, [nodeId]);
  if (rows.rows.length > 0) return rows.rows[0].id;
  const lower = nodeId.toLowerCase();
  const byLower = await client.query(`SELECT id FROM hierarchy_nodes WHERE id = $1 LIMIT 1`, [lower]);
  if (byLower.rows.length > 0) return byLower.rows[0].id;
  if (nodeId.toUpperCase().startsWith('B-')) {
    const buildingId = nodeId.slice(2).toLowerCase();
    const byBuilding = await client.query(
      `SELECT id FROM hierarchy_nodes WHERE building_id = $1 ORDER BY level ASC LIMIT 1`,
      [buildingId],
    );
    if (byBuilding.rows.length > 0) return byBuilding.rows[0].id;
  }
  return nodeId;
}

async function run(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function main() {
  const nodeId = process.env.NODE_ID;
  const from = process.env.FROM;
  const to = process.env.TO;

  if (!nodeId) {
    console.error('Falta NODE_ID (ej. B-arauco-estaci-n). Uso: NODE_ID=... FROM=... TO=... node hierarchy-consumption-debug.mjs');
    process.exit(1);
  }
  if (!from || !to) {
    console.error('Faltan FROM y TO (fechas ISO, ej. FROM=2026-03-06 TO=2026-03-13).');
    process.exit(1);
  }

  let config;
  if (useLocalCredentials()) {
    config = {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL !== 'false' ? getPgSslOptionsForRds() : false,
    };
  } else {
    const secret = await getSecretJson(DB_SECRET_NAME);
    config = buildDbConfig(secret, Boolean(process.env.DB_HOST));
  }

  const client = new Client(config);
  try {
    await client.connect();
  } catch (err) {
    console.error('No se pudo conectar a RDS:', err?.message);
    console.error('Comprueba: 1) Túnel abierto (./scripts/tunnel-rds.sh). 2) DB_PORT igual que LOCAL_PORT del túnel.');
    console.error('RDS exige SSL; si ves "no encryption", no uses DB_SSL=false.');
    process.exit(1);
  }

  const out = { nodeId, from, to, subtreeMeters: [], readingsTotalRows: 0, readingsByMeter: [], stagingTotalRows: 0, stagingByMeter: [], message: '' };

  try {
    const resolvedId = await resolveNodeId(client, nodeId);
    out.resolvedNodeId = resolvedId;

    const metersRows = await run(
      client,
      `WITH RECURSIVE subtree AS (
        SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
        UNION ALL
        SELECT h.id, h.meter_id FROM hierarchy_nodes h
        INNER JOIN subtree s ON h.parent_id = s.id
      )
      SELECT id, meter_id FROM subtree WHERE meter_id IS NOT NULL`,
      [resolvedId],
    );

    out.subtreeMeters = metersRows.map((r) => ({ nodeId: r.id, meterId: r.meter_id }));

    if (out.subtreeMeters.length === 0) {
      out.message =
        'El subárbol no tiene nodos con meter_id (solo nodos hoja/circuito tienen medidor).';
    } else {
      const readingsRows = await run(
        client,
        `WITH RECURSIVE subtree AS (
          SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
          UNION ALL
          SELECT h.id, h.meter_id FROM hierarchy_nodes h
          INNER JOIN subtree s ON h.parent_id = s.id
        )
        SELECT s.meter_id AS meter_id, COUNT(*)::bigint AS cnt
        FROM readings r
        INNER JOIN subtree s ON TRIM(LOWER(s.meter_id)) = TRIM(LOWER(r.meter_id))
        WHERE r.timestamp >= $2 AND r.timestamp <= $3
        GROUP BY s.meter_id`,
        [resolvedId, from, to],
      );
      const readingsMap = new Map((readingsRows || []).map((r) => [r.meter_id, Number(r.cnt ?? 0)]));
      out.readingsByMeter = out.subtreeMeters.map((m) => ({
        meterId: m.meterId,
        rowCount: readingsMap.get(m.meterId) ?? 0,
      }));
      out.readingsTotalRows = out.readingsByMeter.reduce((s, x) => s + x.rowCount, 0);

      let stagingByMeter = [];
      try {
        const stagingRows = await run(
          client,
          `WITH RECURSIVE subtree AS (
            SELECT id, meter_id FROM hierarchy_nodes WHERE id = $1
            UNION ALL
            SELECT h.id, h.meter_id FROM hierarchy_nodes h
            INNER JOIN subtree s ON h.parent_id = s.id
          )
          SELECT s.meter_id AS meter_id, COUNT(*)::bigint AS cnt
          FROM readings_import_staging r
          INNER JOIN subtree s ON TRIM(LOWER(s.meter_id)) = TRIM(LOWER(r.meter_id))
          WHERE r.timestamp >= $2 AND r.timestamp <= $3
          GROUP BY s.meter_id`,
          [resolvedId, from, to],
        );
        const stagingMap = new Map((stagingRows || []).map((r) => [r.meter_id, Number(r.cnt ?? 0)]));
        stagingByMeter = out.subtreeMeters.map((m) => ({
          meterId: m.meterId,
          rowCount: stagingMap.get(m.meterId) ?? 0,
        }));
      } catch (e) {
        stagingByMeter = out.subtreeMeters.map((m) => ({ meterId: m.meterId, rowCount: 0 }));
      }
      out.stagingByMeter = stagingByMeter;
      out.stagingTotalRows = stagingByMeter.reduce((s, x) => s + x.rowCount, 0);

      if (out.readingsTotalRows === 0 && out.stagingTotalRows === 0) {
        out.message =
          'No hay filas en readings ni en readings_import_staging para estos meter_id en el rango from-to.';
      } else if (out.readingsTotalRows === 0 && out.stagingTotalRows > 0) {
        out.message = 'Solo hay datos en staging; el backend debería usar fallback a staging para totalKwh.';
      } else {
        out.message = 'Hay filas en readings; totalKwh debería ser > 0.';
      }
    }
  } finally {
    await client.end();
  }

  if (process.env.JSON === '1') {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log('NODE_ID:', out.nodeId);
    console.log('resolvedNodeId:', out.resolvedNodeId ?? out.nodeId);
    console.log('from / to:', out.from, '/', out.to);
    console.log('subtreeMeters:', out.subtreeMeters.length, out.subtreeMeters.slice(0, 5).map((m) => m.meterId).join(', ') + (out.subtreeMeters.length > 5 ? '...' : ''));
    console.log('readings total filas en rango:', out.readingsTotalRows);
    console.log('staging total filas en rango:', out.stagingTotalRows);
    console.log('message:', out.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
