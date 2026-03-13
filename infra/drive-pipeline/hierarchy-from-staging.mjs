/**
 * hierarchy-from-staging.mjs — Build and insert hierarchy_nodes for Drive buildings from staging.
 * Copia para ejecución en ECS (drive-pipeline). Lee readings_import_staging e inserta en hierarchy_nodes.
 *
 * En ECS usa DB_SECRET_NAME (Secrets Manager). Local: DB_HOST, DB_NAME, DB_USERNAME, DB_PASSWORD.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');
[join(__dirname, '.env'), join(rootDir, 'backend', '.env'), join(rootDir, '.env')].forEach((p) => dotenv.config({ path: p }));

import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import pg from 'pg';

const { Client } = pg;

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const DRY_RUN = process.env.DRY_RUN === 'true';

const LEGACY_BUILDING_IDS = new Set(['pac4220', 's7-1200']);

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
      ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    };
  }
  return null;
}

async function getSecretJson(secretId) {
  const secretsClient = new SecretsManagerClient({ region: REGION });
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) throw new Error(`Secret ${secretId} does not contain SecretString`);
  return JSON.parse(response.SecretString);
}

function buildDbConfig(secret) {
  return {
    host: process.env.DB_HOST || secret.host || secret.DB_HOST,
    port: Number(process.env.DB_PORT || secret.port || secret.DB_PORT || 5432),
    database: process.env.DB_NAME || secret.dbname || secret.database || secret.DB_NAME,
    user: process.env.DB_USERNAME || process.env.DB_USER || secret.username || secret.user || secret.DB_USERNAME,
    password: process.env.DB_PASSWORD || secret.password || secret.DB_PASSWORD,
    ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  };
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function log(msg) {
  console.log(`[hierarchy-from-staging] ${msg}`);
}

async function getDriveBuildingsWithoutHierarchy(client) {
  const raw = await client.query(`
    SELECT DISTINCT center_name FROM readings_import_staging ORDER BY center_name
  `);
  const withSlug = raw.rows.map((r) => ({ centerName: r.center_name, buildingId: slugify(r.center_name) }));
  const byBuilding = new Map();
  withSlug.forEach((x) => {
    if (!byBuilding.has(x.buildingId)) byBuilding.set(x.buildingId, x.centerName);
  });
  const buildingIds = [...byBuilding.keys()];
  const existingInBuildings = await client.query(
    `SELECT id FROM buildings WHERE id = ANY($1::text[])`,
    [buildingIds],
  );
  const inBuildings = new Set(existingInBuildings.rows.map((r) => r.id));
  const withHierarchy = await client.query(`SELECT DISTINCT building_id FROM hierarchy_nodes`);
  const hasHierarchy = new Set(withHierarchy.rows.map((r) => r.building_id));
  return [...byBuilding.entries()]
    .filter(
      ([id, _]) => inBuildings.has(id) && !hasHierarchy.has(id) && !LEGACY_BUILDING_IDS.has(id),
    )
    .map(([buildingId, centerName]) => ({ buildingId, centerName }));
}

async function getStagingTree(client, centerName) {
  const all = await client.query(
    `SELECT center_type, store_type, store_name, meter_id
     FROM readings_import_staging
     WHERE center_name = $1`,
    [centerName],
  );
  if (all.rows.length === 0) return null;
  const rows = all.rows;
  const centerTypes = [...new Set(rows.map((r) => r.center_type))].sort();
  const panelKeys = [...new Set(rows.map((r) => `${r.center_type}\t${r.store_type}`))].sort();
  const circuitRows = rows.reduce((acc, r) => {
    const key = `${r.center_type}\t${r.store_type}\t${r.meter_id}`;
    if (!acc.has(key)) acc.set(key, { center_type: r.center_type, store_type: r.store_type, meter_id: r.meter_id, store_name: r.store_name });
    return acc;
  }, new Map());
  return { centerTypes, panelKeys, circuits: [...circuitRows.values()] };
}

const MAX_NODE_ID_LENGTH = 20;

function buildNodes(buildingId, buildingName, tree) {
  const nodes = [];
  const buildingNodeId = `B-${buildingId}`.slice(0, MAX_NODE_ID_LENGTH);
  const shortBuilding = buildingId.slice(0, 8);
  nodes.push({
    id: buildingNodeId,
    parent_id: null,
    building_id: buildingId,
    name: (buildingName && String(buildingName).trim()) ? String(buildingName).trim().slice(0, 100) : buildingId,
    level: 1,
    node_type: 'building',
    meter_id: null,
    sort_order: 0,
  });
  const { centerTypes, panelKeys, circuits } = tree;
  const panelIdByIndex = new Map();
  centerTypes.forEach((ct, i) => {
    const panelId = `P-${shortBuilding}-${i}`.slice(0, MAX_NODE_ID_LENGTH);
    panelIdByIndex.set(ct, panelId);
    nodes.push({
      id: panelId,
      parent_id: buildingNodeId,
      building_id: buildingId,
      name: (ct && String(ct).trim()) ? String(ct).trim().slice(0, 100) : `Panel ${i}`,
      level: 2,
      node_type: 'panel',
      meter_id: null,
      sort_order: i,
    });
  });
  const subpanelIdByKey = new Map();
  let subIndex = 0;
  panelKeys.forEach((pk) => {
    const [ct, st] = pk.split('\t');
    const panelId = panelIdByIndex.get(ct);
    if (!panelId) return;
    const subId = `S-${panelId}-${subIndex}`.slice(0, MAX_NODE_ID_LENGTH);
    subpanelIdByKey.set(pk, subId);
    nodes.push({
      id: subId,
      parent_id: panelId,
      building_id: buildingId,
      name: (st && String(st).trim()) ? String(st).trim().slice(0, 100) : `Subpanel ${subIndex}`,
      level: 3,
      node_type: 'subpanel',
      meter_id: null,
      sort_order: subIndex,
    });
    subIndex++;
  });
  let circuitOrder = 0;
  circuits.forEach((c) => {
    const parentKey = `${c.center_type}\t${c.store_type}`;
    const subId = subpanelIdByKey.get(parentKey);
    if (!subId) return;
    const name = (c.store_name && String(c.store_name).trim()) ? String(c.store_name).trim().slice(0, 100) : `Medidor ${c.meter_id}`;
    nodes.push({
      id: c.meter_id,
      parent_id: subId,
      building_id: buildingId,
      name,
      level: 4,
      node_type: 'circuit',
      meter_id: c.meter_id,
      sort_order: circuitOrder++,
    });
  });
  return nodes;
}

async function main() {
  log('Loading DB config...');
  let config = configFromEnv();
  if (!config) {
    try {
      const secret = await getSecretJson(DB_SECRET_NAME);
      config = buildDbConfig(secret);
    } catch (err) {
      console.error('[hierarchy-from-staging] Sin config local. En ECS se usa Secrets Manager.');
      console.error('Error:', err.message);
      process.exit(1);
    }
  }
  const client = new Client(config);
  await client.connect();

  try {
    const buildingIds = await getDriveBuildingsWithoutHierarchy(client);
    log(`Buildings to process (Drive, no hierarchy yet): ${buildingIds.length}`);
    if (buildingIds.length === 0) {
      log('Nothing to do.');
      return;
    }

    const allNodes = [];
    for (const { buildingId, centerName } of buildingIds) {
      const tree = await getStagingTree(client, centerName);
      if (!tree || tree.circuits.length === 0) {
        log(`Skip ${buildingId}: no staging data or no circuits`);
        continue;
      }
      const nodes = buildNodes(buildingId, centerName, tree);
      allNodes.push(...nodes);
      log(`  ${buildingId}: ${nodes.length} nodes (${tree.centerTypes.length} panels, ${tree.circuits.length} circuits)`);
    }

    if (allNodes.length === 0) {
      log('No nodes to insert.');
      return;
    }

    if (DRY_RUN) {
      log('[DRY_RUN] Would insert:');
      allNodes.slice(0, 30).forEach((n) => log(`  ${n.id} level=${n.level} parent=${n.parent_id} name=${n.name}`));
      if (allNodes.length > 30) log(`  ... and ${allNodes.length - 30} more`);
      return;
    }

    let inserted = 0;
    for (const n of allNodes) {
      await client.query(
        `INSERT INTO hierarchy_nodes (id, parent_id, building_id, name, level, node_type, meter_id, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [n.id, n.parent_id, n.building_id, n.name, n.level, n.node_type, n.meter_id, n.sort_order],
      );
      inserted++;
      if (inserted % 50 === 0) log(`Inserted ${inserted}/${allNodes.length}...`);
    }
    log(`Done. ${inserted} hierarchy nodes inserted.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
