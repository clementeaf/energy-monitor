#!/usr/bin/env node
/** Check restore progress by tailing /tmp/restore.log in ECS container. */
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

execFileSync('aws', [
  'ecs', 'execute-command', '--cluster', ECS_CLUSTER, '--task', taskId,
  '--container', ECS_CONTAINER, '--region', AWS_REGION, '--interactive',
  '--command', 'sh -c "tail -30 /tmp/restore.log 2>/dev/null || echo No log yet"',
], { stdio: 'inherit' });
