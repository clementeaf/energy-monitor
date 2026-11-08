#!/usr/bin/env node
/**
 * Download a SQL file from S3 and execute it against a target database via ECS Exec.
 * Uses @aws-sdk/client-s3 inside the container (aws CLI is not installed).
 *
 * Usage:
 *   node scripts/apply-s3-sql-ecs.mjs s3://bucket/key.sql [db_name]
 *
 * db_name defaults to the container's DB_NAME env var.
 */
import { execFileSync } from 'child_process';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const ECS_CLUSTER = process.env.ECS_CLUSTER ?? 'monitoreo-v2';
const ECS_SERVICE = process.env.ECS_SERVICE ?? 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = process.env.ECS_CONTAINER ?? 'backend';

function getRunningTaskId() {
  const taskArn = execFileSync('aws', [
    'ecs', 'list-tasks', '--cluster', ECS_CLUSTER, '--service-name', ECS_SERVICE,
    '--desired-status', 'RUNNING', '--region', AWS_REGION,
    '--query', 'taskArns[0]', '--output', 'text',
  ], { encoding: 'utf8' }).trim();
  if (!taskArn || taskArn === 'None') throw new Error('No running task');
  return taskArn.split('/').pop();
}

const s3Uri = process.argv[2];
const dbName = process.argv[3] || '';

if (!s3Uri) {
  console.error('Usage: node apply-s3-sql-ecs.mjs <s3://bucket/key.sql> [db_name]');
  process.exit(1);
}

const match = s3Uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
if (!match) { console.error('Invalid S3 URI'); process.exit(1); }
const [, bucket, key] = match;

const dbOverride = dbName ? `process.env.DB_NAME='${dbName}';` : '';

const nodeScript = `
${dbOverride}
const pg=require('pg');const fs=require('fs');
const{S3Client,GetObjectCommand}=require('@aws-sdk/client-s3');
(async()=>{
  const s3=new S3Client({region:'${AWS_REGION}'});
  console.log('Downloading from S3...');
  const resp=await s3.send(new GetObjectCommand({Bucket:'${bucket}',Key:'${key}'}));
  const chunks=[];for await(const c of resp.Body)chunks.push(c);
  const sql=Buffer.concat(chunks).toString('utf8');
  console.log('Downloaded',Math.round(sql.length/1024),'KB');
  const ca=fs.readFileSync('/app/certs/rds-global-bundle.pem');
  const client=new pg.Client({
    host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),
    database:process.env.DB_NAME,user:process.env.DB_USERNAME,
    password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca}
  });
  await client.connect();
  console.log('Connected to',process.env.DB_HOST,'/',process.env.DB_NAME);
  const stmts=sql.split(';\\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('--'));
  console.log(stmts.length,'statements');
  let ok=0,err=0;
  for(let i=0;i<stmts.length;i++){
    try{await client.query(stmts[i]);ok++}
    catch(e){err++;if(err<=5)console.error('ERR stmt',i+1,':',e.message.slice(0,200))}
    if((i+1)%50===0)console.log('  '+ok+'/'+stmts.length+' ok, '+err+' errors');
  }
  await client.end();
  console.log('Done:',ok,'ok,',err,'errors');
})().catch(e=>{console.error(e.message);process.exit(1)});
`.replace(/\n/g, ' ');

const taskId = getRunningTaskId();

console.log(`S3:       ${s3Uri}`);
console.log(`Database: ${dbName || '(container default)'}`);
console.log(`Task:     ${taskId}`);
console.log('Executing via ECS Exec...\n');

execFileSync('aws', [
  'ecs', 'execute-command', '--cluster', ECS_CLUSTER, '--task', taskId,
  '--container', ECS_CONTAINER, '--region', AWS_REGION, '--interactive',
  '--command', `sh -c ${JSON.stringify(`node -e ${JSON.stringify(nodeScript)}`)}`,
], { stdio: 'inherit' });
