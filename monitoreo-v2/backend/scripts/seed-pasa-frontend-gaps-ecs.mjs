#!/usr/bin/env node
/**
 * Run seed-pasa-frontend-gaps.mjs on prod RDS via ECS Exec.
 *
 * Usage:
 *   node scripts/seed-pasa-frontend-gaps-ecs.mjs
 *   TENANT_SLUG=pasa node scripts/seed-pasa-frontend-gaps-ecs.mjs
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PASA_DIR = join(__dirname, '..', '..', 'scripts', 'pasa-readings');
const SEED_SCRIPT = join(PASA_DIR, 'seed-pasa-frontend-gaps.mjs');
const DB_LIB = join(PASA_DIR, 'lib', 'db.mjs');

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const ECS_CLUSTER = process.env.ECS_CLUSTER ?? 'monitoreo-v2';
const ECS_SERVICE = process.env.ECS_SERVICE ?? 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = process.env.ECS_CONTAINER ?? 'backend';
const TENANT_SLUG = process.env.TENANT_SLUG ?? 'pasa';

/**
 * Returns the first running ECS task id for the backend service.
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
 * Builds shell command that writes seed files and runs them in ECS.
 * @param {string} seedB64 - Base64 seed script
 * @param {string} dbB64 - Base64 db lib
 * @returns {string} sh -c command
 */
function buildShellCommand(seedB64, dbB64) {
  const setup = [
    'mkdir -p /tmp/pasa-seed/lib',
    `printf %s ${JSON.stringify(seedB64)} | base64 -d > /tmp/pasa-seed/seed-pasa-frontend-gaps.mjs`,
    `printf %s ${JSON.stringify(dbB64)} | base64 -d > /tmp/pasa-seed/lib/db.mjs`,
    `export TENANT_SLUG=${JSON.stringify(TENANT_SLUG)}`,
    'cd /app && node /tmp/pasa-seed/seed-pasa-frontend-gaps.mjs',
  ].join(' && ');
  return setup;
}

/**
 * Runs seed script inside ECS container with RDS env vars.
 * @param {string} taskId - ECS task id
 * @param {string} seedB64 - Base64-encoded seed script
 * @param {string} dbB64 - Base64-encoded db lib
 */
function runEcsSeed(taskId, seedB64, dbB64) {
  const shellCommand = buildShellCommand(seedB64, dbB64);

  console.log(`Cluster: ${ECS_CLUSTER}`);
  console.log(`Service: ${ECS_SERVICE}`);
  console.log(`Task:    ${taskId}`);
  console.log(`Tenant:  ${TENANT_SLUG}`);
  console.log('Seeding via ECS Exec...\n');

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

const seedB64 = readFileSync(SEED_SCRIPT).toString('base64');
const dbB64 = readFileSync(DB_LIB).toString('base64');
const taskId = getRunningTaskId();
runEcsSeed(taskId, seedB64, dbB64);
