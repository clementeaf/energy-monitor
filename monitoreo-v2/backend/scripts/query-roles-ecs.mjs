#!/usr/bin/env node
import { execFileSync } from 'child_process';

const AWS_REGION = 'us-east-1';
const ECS_CLUSTER = 'monitoreo-v2';
const ECS_SERVICE = 'monitoreo-v2-backend-restored';

const taskArn = execFileSync('aws', ['ecs', 'list-tasks', '--cluster', ECS_CLUSTER, '--service-name', ECS_SERVICE, '--desired-status', 'RUNNING', '--region', AWS_REGION, '--query', 'taskArns[0]', '--output', 'text'], { encoding: 'utf8' }).trim();
const taskId = taskArn.split('/').pop();

const nodeScript = `const pg=require('pg');const fs=require('fs');const client=new pg.Client({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME,user:process.env.DB_USERNAME,password:process.env.DB_PASSWORD,ssl:{rejectUnauthorized:true,ca:fs.readFileSync('/app/certs/rds-global-bundle.pem')}});(async()=>{await client.connect();const r=await client.query("SELECT slug,name,tenant_id FROM roles ORDER BY slug");console.log(JSON.stringify(r.rows,null,2));await client.end();})().catch(e=>{console.error(e.message);process.exit(1);});`;

execFileSync('aws', ['ecs', 'execute-command', '--cluster', ECS_CLUSTER, '--task', taskId, '--container', 'backend', '--region', AWS_REGION, '--interactive', '--command', `node -e ${JSON.stringify(nodeScript)}`], { stdio: 'inherit' });
