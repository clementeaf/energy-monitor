#!/usr/bin/env node
/**
 * Apply a monitoreo-v2 SQL migration on prod RDS via ECS Exec.
 *
 * Usage:
 *   node scripts/apply-migration-ecs.mjs 42-building-tenant-import
 *
 * Requires: AWS CLI, session-manager-plugin, IAM ecs:ExecuteCommand + ssm:StartSession
 */
import { execFileSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = join(__dirname, '..');
const MIGRATIONS_DIR = join(BACKEND_DIR, '..', 'database', 'migrations');

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const ECS_CLUSTER = process.env.ECS_CLUSTER ?? 'monitoreo-v2';
const ECS_SERVICE = process.env.ECS_SERVICE ?? 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = process.env.ECS_CONTAINER ?? 'backend';

/**
 * Resolves migration file path from CLI id.
 * @param {string} migrationId - Migration id without or with .sql
 * @returns {string} Absolute path to SQL file
 */
function resolveMigrationPath(migrationId) {
  const fileName = migrationId.endsWith('.sql') ? migrationId : `${migrationId}.sql`;
  const filePath = join(MIGRATIONS_DIR, fileName);
  if (!existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }
  return filePath;
}

/**
 * Returns the first running ECS task ARN for the backend service.
 * @returns {string} Task id (short form)
 */
function getRunningTaskId() {
  const taskArn = execFileSync(
    'aws',
    [
      'ecs', 'list-tasks',
      '--cluster', ECS_CLUSTER,
      '--service-name', ECS_SERVICE,
      '--desired-status', 'RUNNING',
      '--region', AWS_REGION,
      '--query', 'taskArns[0]',
      '--output', 'text',
    ],
    { encoding: 'utf8' },
  ).trim();

  if (!taskArn || taskArn === 'None') {
    throw new Error(`No RUNNING task for ${ECS_CLUSTER}/${ECS_SERVICE}`);
  }
  return taskArn.split('/').pop() ?? taskArn;
}

/**
 * Builds the Node.js snippet executed inside the ECS container (single line for node -e).
 * @returns {string} Node -e script source
 */
function buildRemoteNodeScript() {
  return "const pg=require('pg');const fs=require('fs');const sql=Buffer.from(process.env.MIGRATION_B64,'base64').toString('utf8');const client=new pg.Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca:fs.readFileSync('/app/certs/rds-global-bundle.pem')}});(async()=>{await client.connect();console.log('Connected to',process.env.DB_HOST,'/',process.env.DB_NAME);await client.query(sql);await client.end();console.log('Migration applied successfully');})().catch((err)=>{console.error(err.message);process.exit(1);});";
}

/**
 * Runs ECS execute-command with migration SQL injected via env var.
 * @param {string} taskId - ECS task id
 * @param {string} migrationB64 - Base64-encoded SQL
 * @param {string} migrationId - Migration id for logging
 */
function runEcsMigration(taskId, migrationB64, migrationId) {
  const nodeScript = buildRemoteNodeScript();
  const shellCommand = `export MIGRATION_B64=${JSON.stringify(migrationB64)}; node -e ${JSON.stringify(nodeScript)}`;

  console.log(`Cluster:   ${ECS_CLUSTER}`);
  console.log(`Service:   ${ECS_SERVICE}`);
  console.log(`Task:      ${taskId}`);
  console.log(`Migration: ${migrationId}`);
  console.log('Applying via ECS Exec...\n');

  execFileSync(
    'aws',
    [
      'ecs', 'execute-command',
      '--cluster', ECS_CLUSTER,
      '--task', taskId,
      '--container', ECS_CONTAINER,
      '--region', AWS_REGION,
      '--interactive',
      '--command', `sh -c ${JSON.stringify(shellCommand)}`,
    ],
    { stdio: 'inherit' },
  );
}

/**
 * CLI entrypoint.
 */
function main() {
  const migrationId = process.argv[2];
  if (!migrationId) {
    console.error('Usage: node scripts/apply-migration-ecs.mjs <migration-id>');
    process.exit(1);
  }

  const sqlPath = resolveMigrationPath(migrationId);
  const migrationB64 = readFileSync(sqlPath).toString('base64');
  const taskId = getRunningTaskId();
  runEcsMigration(taskId, migrationB64, migrationId.replace(/\.sql$/, ''));
}

main();
