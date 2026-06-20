#!/usr/bin/env node
/**
 * Restore ONE mapvx table from S3 SQL dump via ECS Exec.
 * The node script runs foreground — for small tables it completes within session timeout.
 *
 * Usage:
 *   node scripts/restore-table-from-s3.mjs mapvx_malls
 *   node scripts/restore-table-from-s3.mjs mapvx_floors
 *   node scripts/restore-table-from-s3.mjs mapvx_stores
 *   node scripts/restore-table-from-s3.mjs mapvx_geometries
 *   node scripts/restore-table-from-s3.mjs mapvx_tiles
 *   node scripts/restore-table-from-s3.mjs all   # all tables in order
 */
import { execFileSync } from 'child_process';

const AWS_REGION = 'us-east-1';
const ECS_CLUSTER = 'monitoreo-v2';
const ECS_SERVICE = 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = 'backend';
const ALL_TABLES = ['mapvx_malls', 'mapvx_floors', 'mapvx_stores', 'mapvx_geometries', 'mapvx_tiles'];

function getRunningTaskId() {
  const taskArn = execFileSync('aws', [
    'ecs', 'list-tasks', '--cluster', ECS_CLUSTER, '--service-name', ECS_SERVICE,
    '--desired-status', 'RUNNING', '--region', AWS_REGION,
    '--query', 'taskArns[0]', '--output', 'text',
  ], { encoding: 'utf8' }).trim();
  if (!taskArn || taskArn === 'None') throw new Error('No running task');
  return taskArn.split('/').pop();
}

function restoreTable(taskId, table) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Restoring: ${table}`);
  console.log(`${'='.repeat(50)}`);

  const nodeScript = `
    const pg=require('pg');const fs=require('fs');
    const{S3Client,GetObjectCommand}=require('@aws-sdk/client-s3');
    (async()=>{
      const s3c=new S3Client({region:'${AWS_REGION}'});
      console.log('Downloading ${table} from S3...');
      const resp=await s3c.send(new GetObjectCommand({Bucket:'power-monitor-frontend',Key:'seeds/${table}.sql'}));
      const chunks=[];for await(const c of resp.Body)chunks.push(c);
      const sql=Buffer.concat(chunks).toString('utf8');
      const lines=sql.split('\\n').filter(l=>l.startsWith('INSERT'));
      console.log(lines.length+' INSERTs ('+Math.round(sql.length/1024)+'KB)');
      const ca=fs.readFileSync('/app/certs/rds-global-bundle.pem');
      const client=new pg.Client({host:process.env.DB_HOST,port:5432,database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca}});
      await client.connect();
      let ok=0,skip=0,err=0;
      for(let i=0;i<lines.length;i++){
        try{await client.query(lines[i]);ok++}
        catch(e){
          if(e.message.includes('duplicate')||e.message.includes('unique'))skip++;
          else{err++;if(err<3)console.error('ERR:',e.message.slice(0,120))}
        }
        if((i+1)%100===0)console.log('  '+i+1+'/'+lines.length);
      }
      await client.end();
      console.log('${table}: ok='+ok+' skip='+skip+' err='+err);
    })().catch(e=>{console.error(e.message);process.exit(1)});
  `.replace(/\n/g,' ').replace(/\s+/g,' ').trim();

  execFileSync('aws', [
    'ecs', 'execute-command', '--cluster', ECS_CLUSTER, '--task', taskId,
    '--container', ECS_CONTAINER, '--region', AWS_REGION, '--interactive',
    '--command', `sh -c ${JSON.stringify(`node -e ${JSON.stringify(nodeScript)}`)}`,
  ], { stdio: 'inherit' });
}

const arg = process.argv[2];
if (!arg) { console.error('Usage: node restore-table-from-s3.mjs <table|all>'); process.exit(1); }

const taskId = getRunningTaskId();
const tables = arg === 'all' ? ALL_TABLES : [arg];

for (const table of tables) {
  if (!ALL_TABLES.includes(table)) { console.error(`Unknown table: ${table}`); process.exit(1); }
  restoreTable(taskId, table);
}
