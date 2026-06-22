#!/usr/bin/env node
/**
 * Apply a large SQL dump to prod RDS via ECS Exec in chunks.
 * Splits SQL by statements and sends batches that fit in ECS Exec command limit.
 *
 * Usage:
 *   node scripts/apply-sql-dump-ecs.mjs /tmp/mapvx-no-tiles.sql
 *   node scripts/apply-sql-dump-ecs.mjs /tmp/mapvx-tiles.sql
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const ECS_CLUSTER = process.env.ECS_CLUSTER ?? 'monitoreo-v2';
const ECS_SERVICE = process.env.ECS_SERVICE ?? 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = process.env.ECS_CONTAINER ?? 'backend';
const MAX_B64_SIZE = 30_000; // ~30KB base64 per chunk (ECS Exec command limit ~48KB)

function getRunningTaskId() {
  const taskArn = execFileSync('aws', [
    'ecs', 'list-tasks', '--cluster', ECS_CLUSTER, '--service-name', ECS_SERVICE,
    '--desired-status', 'RUNNING', '--region', AWS_REGION,
    '--query', 'taskArns[0]', '--output', 'text',
  ], { encoding: 'utf8' }).trim();
  if (!taskArn || taskArn === 'None') throw new Error('No running task');
  return taskArn.split('/').pop();
}

function buildNodeScript() {
  return "const pg=require('pg');const fs=require('fs');const sql=Buffer.from(process.env.MIGRATION_B64,'base64').toString('utf8');const client=new pg.Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca:fs.readFileSync('/app/certs/rds-global-bundle.pem')}});(async()=>{await client.connect();await client.query(sql);await client.end();console.log('Chunk applied ('+sql.length+' bytes)');})().catch((err)=>{console.error(err.message);process.exit(1);});";
}

function runChunk(taskId, sqlChunk, chunkIdx, total) {
  const b64 = Buffer.from(sqlChunk).toString('base64');
  const nodeScript = buildNodeScript();
  const shellCmd = `export MIGRATION_B64=${JSON.stringify(b64)}; node -e ${JSON.stringify(nodeScript)}`;

  console.log(`  Chunk ${chunkIdx + 1}/${total} (${(sqlChunk.length / 1024).toFixed(0)}KB SQL, ${(b64.length / 1024).toFixed(0)}KB b64)...`);

  execFileSync('aws', [
    'ecs', 'execute-command', '--cluster', ECS_CLUSTER, '--task', taskId,
    '--container', ECS_CONTAINER, '--region', AWS_REGION, '--interactive',
    '--command', `sh -c ${JSON.stringify(shellCmd)}`,
  ], { stdio: 'inherit' });
}

const sqlFile = process.argv[2];
if (!sqlFile) { console.error('Usage: node apply-sql-dump-ecs.mjs <file.sql>'); process.exit(1); }

const sql = readFileSync(sqlFile, 'utf8');

// Split by statements (each INSERT is one line ending with ;)
const statements = sql.split('\n').filter(l => l.trim() && !l.startsWith('--'));

// Group statements into chunks that fit MAX_B64_SIZE
const chunks = [];
let current = [];
let currentSize = 0;

for (const stmt of statements) {
  const stmtB64Size = Buffer.from(stmt).toString('base64').length;
  if (currentSize + stmtB64Size > MAX_B64_SIZE && current.length > 0) {
    chunks.push(current.join('\n'));
    current = [];
    currentSize = 0;
  }
  current.push(stmt);
  currentSize += stmtB64Size;
}
if (current.length > 0) chunks.push(current.join('\n'));

console.log(`SQL file: ${sqlFile} (${(sql.length / 1024 / 1024).toFixed(1)}MB)`);
console.log(`Split into ${chunks.length} chunks`);

const taskId = getRunningTaskId();

for (let i = 0; i < chunks.length; i++) {
  runChunk(taskId, chunks[i], i, chunks.length);
}

console.log('\nAll chunks applied.');
