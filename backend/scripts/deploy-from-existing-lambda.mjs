#!/usr/bin/env node
/**
 * Despliega el backend usando la misma VPC y variables que la Lambda ya desplegada.
 * Requiere: AWS CLI configurado (perfil/credenciales), npm run build previo opcional.
 *
 * Uso: node scripts/deploy-from-existing-lambda.mjs
 *      AWS_REGION=us-east-1 node scripts/deploy-from-existing-lambda.mjs
 */
import { execSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, '..');
const region = process.env.AWS_REGION ?? 'us-east-1';
const functionName = process.env.LAMBDA_REF ?? 'power-digital-api-dev-api';

const raw = execSync(
  `aws lambda get-function-configuration --function-name "${functionName}" --region "${region}" --output json`,
  { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
);
const cfg = JSON.parse(raw);
const vpc = cfg.VpcConfig ?? {};
const sg = vpc.SecurityGroupIds?.[0];
const subnets = vpc.SubnetIds ?? [];
if (!sg || subnets.length < 3) {
  console.error('No se pudo leer VPC de la Lambda (¿nombre de función o región incorrectos?)');
  process.exit(1);
}

const env = { ...process.env };
env.VPC_SECURITY_GROUP_ID = sg;
env.VPC_SUBNET_ID_1 = subnets[0];
env.VPC_SUBNET_ID_2 = subnets[1];
env.VPC_SUBNET_ID_3 = subnets[2];

const vars = cfg.Environment?.Variables ?? {};
for (const k of ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD', 'GOOGLE_CLIENT_ID', 'MICROSOFT_CLIENT_ID', 'MIGRATE_SECRET']) {
  if (vars[k] !== undefined && vars[k] !== null) {
    env[k] = String(vars[k]);
  }
}

console.error(`VPC desde ${functionName} (${region}): SG=${sg}, subnets=${subnets.slice(0, 3).join(',')}`);

const build = spawnSync('npm', ['run', 'build'], { cwd: backendRoot, env, stdio: 'inherit' });
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const r = spawnSync('npx', ['sls', 'deploy', '--stage', 'dev'], {
  cwd: backendRoot,
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
