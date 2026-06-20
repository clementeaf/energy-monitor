#!/usr/bin/env node
/**
 * Run ALL mapvx seed scripts on prod RDS via ECS Exec.
 *
 * Seeds that only need `pg` are base64'd and run directly in the container.
 * Seeds that need `pbf`/`@mapbox/vector-tile` install deps in /tmp first.
 *
 * Usage:
 *   node scripts/seed-mapvx-ecs.mjs                    # all 4 seeds
 *   node scripts/seed-mapvx-ecs.mjs markers             # only parquearauco markers
 *   node scripts/seed-mapvx-ecs.mjs tiles               # only tiles
 *   node scripts/seed-mapvx-ecs.mjs data                # mapvx API data (needs pbf)
 *   node scripts/seed-mapvx-ecs.mjs osm                 # OSM malls (needs pbf)
 */
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = __dirname;

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const ECS_CLUSTER = process.env.ECS_CLUSTER ?? 'monitoreo-v2';
const ECS_SERVICE = process.env.ECS_SERVICE ?? 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = process.env.ECS_CONTAINER ?? 'backend';

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
 * @param {string} taskId
 * @param {string} scriptFile - filename in scripts/
 * @param {object} opts
 * @param {boolean} opts.needsPbf - install pbf + @mapbox/vector-tile in /tmp
 * @param {string} opts.label
 */
function runSeedInEcs(taskId, scriptFile, { needsPbf = false, label = scriptFile } = {}) {
  const scriptPath = join(SCRIPTS_DIR, scriptFile);
  const scriptB64 = readFileSync(scriptPath).toString('base64');

  const steps = [
    'mkdir -p /tmp/seed',
    `printf %s ${JSON.stringify(scriptB64)} | base64 -d > /tmp/seed/${scriptFile}`,
  ];

  // ESM resolves imports relative to file location, not CWD.
  // Symlink /app/node_modules so all deps (pg, pbf, @mapbox/vector-tile) resolve.
  steps.push(
    'ln -sf /app/node_modules /tmp/seed/node_modules',
    `node /tmp/seed/${scriptFile}`,
  );

  const shellCommand = steps.join(' && ');

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Seed: ${label}`);
  console.log(`Task: ${taskId}`);
  console.log(`${'='.repeat(50)}\n`);

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

const SEEDS = {
  data:    { file: 'seed-mapvx-data.mjs',             needsPbf: true,  label: 'MapVX API data (4 malls, stores, geometry)' },
  osm:     { file: 'seed-osm-malls.mjs',              needsPbf: true,  label: 'OSM Mallplaza malls (14 malls)' },
  tiles:   { file: 'seed-mapvx-tiles.mjs',            needsPbf: false, label: 'PBF vector tiles (all malls)' },
  markers: { file: 'seed-parquearauco-markers.mjs',    needsPbf: false, label: 'Parque Arauco marker malls (27)' },
};

const requested = process.argv[2];
const taskId = getRunningTaskId();

if (requested && SEEDS[requested]) {
  const s = SEEDS[requested];
  runSeedInEcs(taskId, s.file, { needsPbf: s.needsPbf, label: s.label });
} else if (!requested) {
  // Run all in order
  for (const [key, s] of Object.entries(SEEDS)) {
    runSeedInEcs(taskId, s.file, { needsPbf: s.needsPbf, label: s.label });
  }
} else {
  console.error(`Unknown seed: ${requested}`);
  console.error(`Available: ${Object.keys(SEEDS).join(', ')}`);
  process.exit(1);
}

console.log('\n=== All seeds completed ===');
