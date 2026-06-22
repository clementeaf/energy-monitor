#!/usr/bin/env node
/**
 * Restore mapvx data from S3 SQL dump via ECS Exec.
 * Downloads dump from S3, then pipes through psql inside the container.
 *
 * Usage:
 *   node scripts/restore-mapvx-from-s3.mjs
 */
import { execFileSync } from 'child_process';

const AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
const ECS_CLUSTER = process.env.ECS_CLUSTER ?? 'monitoreo-v2';
const ECS_SERVICE = process.env.ECS_SERVICE ?? 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = process.env.ECS_CONTAINER ?? 'backend';
const S3_PATH = 's3://power-monitor-frontend/seeds/mapvx-clean.sql';

function getRunningTaskId() {
  const taskArn = execFileSync('aws', [
    'ecs', 'list-tasks', '--cluster', ECS_CLUSTER, '--service-name', ECS_SERVICE,
    '--desired-status', 'RUNNING', '--region', AWS_REGION,
    '--query', 'taskArns[0]', '--output', 'text',
  ], { encoding: 'utf8' }).trim();
  if (!taskArn || taskArn === 'None') throw new Error('No running task');
  return taskArn.split('/').pop();
}

const taskId = getRunningTaskId();
console.log(`Task: ${taskId}`);
console.log(`S3:   ${S3_PATH}`);
console.log('Downloading from S3 + restoring via node pg...\n');

// Node script that downloads from S3 using aws cli, reads SQL, executes via pg
// Uses COPY format which pg client supports via query()
// Build a node script that runs in background inside the container.
// It downloads each table SQL from S3, strips pg_dump headers, executes statement by statement.
const TABLES = ['mapvx_malls', 'mapvx_floors', 'mapvx_stores', 'mapvx_geometries', 'mapvx_tiles'];
const nodeScript = `
const pg=require('pg');
const fs=require('fs');
const{S3Client,GetObjectCommand}=require('@aws-sdk/client-s3');
const tables=${JSON.stringify(TABLES)};
(async()=>{
  const s3c=new S3Client({region:'${AWS_REGION}'});
  const ca=fs.readFileSync('/app/certs/rds-global-bundle.pem');
  const client=new pg.Client({host:process.env.DB_HOST,port:5432,database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca}});
  await client.connect();
  console.log('Connected to DB');
  for(const table of tables){
    console.log('--- '+table+' ---');
    const resp=await s3c.send(new GetObjectCommand({Bucket:'power-monitor-frontend',Key:'seeds/'+table+'.sql'}));
    const chunks=[];for await(const c of resp.Body)chunks.push(c);
    const sql=Buffer.concat(chunks).toString('utf8');
    const lines=sql.split('\\n').filter(l=>l.startsWith('INSERT'));
    console.log(lines.length+' INSERT statements ('+Math.round(sql.length/1024)+'KB)');
    let ok=0,skip=0,err=0;
    for(const line of lines){
      try{await client.query(line);ok++}
      catch(e){
        if(e.message.includes('duplicate')||e.message.includes('already exists')||e.message.includes('unique'))skip++;
        else{err++;if(err<3)console.error('ERR:',e.message.slice(0,150))}
      }
    }
    console.log('ok='+ok+' skip='+skip+' err='+err);
  }
  await client.end();
  console.log('=== RESTORE COMPLETE ===');
  fs.writeFileSync('/tmp/restore-done.txt','done');
})().catch(e=>{console.error(e.message);process.exit(1)});
`.replace(/\n/g,' ').trim();

// Run in background so ECS Exec session timeout doesn't kill the process.
// Output goes to /tmp/restore.log — check with a follow-up ECS Exec.
const bgCommand = `nohup node -e ${JSON.stringify(nodeScript)} > /tmp/restore.log 2>&1 &`;
console.log('Launching restore in background...');
console.log('Check progress: node scripts/check-restore-log.mjs\n');

execFileSync('aws', [
  'ecs', 'execute-command', '--cluster', ECS_CLUSTER, '--task', taskId,
  '--container', ECS_CONTAINER, '--region', AWS_REGION, '--interactive',
  '--command', `sh -c ${JSON.stringify(bgCommand + ' echo PID=$!')}`,
], { stdio: 'inherit' });
