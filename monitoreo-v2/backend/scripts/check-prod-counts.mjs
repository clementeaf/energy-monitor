#!/usr/bin/env node
import { execFileSync } from 'child_process';

const AWS_REGION = 'us-east-1';
const ECS_CLUSTER = 'monitoreo-v2';
const ECS_SERVICE = 'monitoreo-v2-backend-restored';
const ECS_CONTAINER = 'backend';

const taskArn = execFileSync('aws', [
  'ecs', 'list-tasks', '--cluster', ECS_CLUSTER, '--service-name', ECS_SERVICE,
  '--desired-status', 'RUNNING', '--region', AWS_REGION, '--query', 'taskArns[0]', '--output', 'text',
], { encoding: 'utf8' }).trim();
const taskId = taskArn.split('/').pop();

const script = `const pg=require('pg');const fs=require('fs');const ca=fs.readFileSync('/app/certs/rds-global-bundle.pem');const c=new pg.Client({host:process.env.DB_HOST,port:5432,database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca}});(async()=>{await c.connect();const r=await c.query("SELECT 'malls' as t,count(*)::int as n FROM mapvx_malls UNION ALL SELECT 'floors',count(*)::int FROM mapvx_floors UNION ALL SELECT 'stores',count(*)::int FROM mapvx_stores UNION ALL SELECT 'geometries',count(*)::int FROM mapvx_geometries UNION ALL SELECT 'tiles',count(*)::int FROM mapvx_tiles");r.rows.forEach(r=>console.log(r.t+': '+r.n));await c.end()})().catch(e=>{console.error(e.message);process.exit(1)})`;

execFileSync('aws', [
  'ecs', 'execute-command', '--cluster', ECS_CLUSTER, '--task', taskId,
  '--container', ECS_CONTAINER, '--region', AWS_REGION, '--interactive',
  '--command', `sh -c ${JSON.stringify(`node -e ${JSON.stringify(script)}`)}`,
], { stdio: 'inherit' });
