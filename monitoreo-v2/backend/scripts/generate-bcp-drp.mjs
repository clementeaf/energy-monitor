#!/usr/bin/env node
/**
 * CYB-11: Generate BCP/DRP (Business Continuity / Disaster Recovery Plan).
 *
 * Usage:
 *   node scripts/generate-bcp-drp.mjs [--output path]
 *
 * Reads infrastructure references from codebase and generates a structured
 * BCP/DRP document with recovery procedures, RTO/RPO targets, and runbooks.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT = resolve(__dirname, '..', '..', '..', 'docs', 'ops', 'bcp-drp.md');

/* ── Infrastructure catalog from codebase ── */

const INFRA_COMPONENTS = [
  {
    name: 'ECS Fargate (Backend API)',
    tier: 'critical',
    region: 'us-east-1',
    rto: '30 min',
    rpo: '0 (stateless)',
    recovery: 'Redeploy from ECR image. Service auto-recovers with health check. ECS desired count restores automatically.',
    backup: 'No backup needed — stateless container. Docker images in ECR (5 retained via lifecycle policy).',
    monitoring: 'CloudWatch alarms (CPU, memory, 5xx rate). SNS notification to ops.',
  },
  {
    name: 'RDS PostgreSQL (TimescaleDB)',
    tier: 'critical',
    region: 'us-east-1',
    rto: '< 4 hours',
    rpo: '< 1 hour (automated backups)',
    recovery: 'Restore from automated snapshot (point-in-time, up to 5min granularity). Apply pending migrations via ECS Exec.',
    backup: 'Automated daily snapshots, 7-day retention. Transaction logs for PITR.',
    monitoring: 'CloudWatch: FreeStorageSpace, CPUUtilization, DatabaseConnections. Alarm thresholds configured.',
  },
  {
    name: 'S3 (Frontend SPA + CSV imports)',
    tier: 'high',
    region: 'us-east-1',
    rto: '15 min',
    rpo: '0 (versioning enabled)',
    recovery: 'Frontend: redeploy from build. CSV data: versioned objects recoverable.',
    backup: 'S3 versioning + cross-region replication (if enabled). Objects durable 99.999999999%.',
    monitoring: 'CloudWatch S3 metrics. CloudFront error rate alarm.',
  },
  {
    name: 'CloudFront (CDN)',
    tier: 'high',
    region: 'Global (edge)',
    rto: '5 min',
    rpo: 'N/A (cache)',
    recovery: 'Invalidate cache + redeploy frontend. Distribution config in IaC.',
    backup: 'No backup needed — edge cache rebuilt automatically.',
    monitoring: 'CloudWatch: 4xx/5xx error rate, origin latency.',
  },
  {
    name: 'API Gateway',
    tier: 'critical',
    region: 'us-east-1',
    rto: '15 min',
    rpo: 'N/A (stateless proxy)',
    recovery: 'Managed service — AWS handles availability. Redeploy stage if config changed.',
    backup: 'Configuration exportable via AWS CLI.',
    monitoring: 'CloudWatch: 5xx count, latency, integration errors.',
  },
  {
    name: 'IoT Core (MQTT)',
    tier: 'medium',
    region: 'us-east-1',
    rto: '1 hour',
    rpo: '15 min (last ingest cycle)',
    recovery: 'Managed service. Re-register things/certs if lost. Backfill from S3 raw JSON.',
    backup: 'Thing registry + certificates in secure storage. Raw MQTT payloads stored in S3.',
    monitoring: 'CloudWatch IoT metrics. Rule error alarm.',
  },
  {
    name: 'SES (Email)',
    tier: 'low',
    region: 'us-east-1',
    rto: '1 hour',
    rpo: 'N/A (transactional)',
    recovery: 'Managed service. Verify sender identity if changed.',
    backup: 'No backup — transactional email. Logs in CloudWatch.',
    monitoring: 'SES reputation dashboard. Bounce/complaint rates.',
  },
  {
    name: 'ECR (Container Registry)',
    tier: 'medium',
    region: 'us-east-1',
    rto: '30 min',
    rpo: 'N/A',
    recovery: 'Rebuild and push Docker image from source.',
    backup: 'Lifecycle policy retains 5 images. Source code in GitHub.',
    monitoring: 'ECR scan results for vulnerabilities.',
  },
];

const SCENARIOS = [
  {
    name: 'Database failure (RDS)',
    severity: 'Critical',
    steps: [
      'Detect: CloudWatch DatabaseConnections drops to 0 or FreeStorageSpace alarm',
      'Assess: Check RDS console for instance status, Multi-AZ failover status',
      'Recover: If instance down → restore from latest automated snapshot (PITR)',
      'Apply: Run pending migrations via ECS Exec (docs/ops/rds-migrations-via-ecs-exec.md)',
      'Verify: Run smoke tests (npm run test:smoke-dashboard)',
      'Notify: Inform stakeholders of incident and recovery time',
    ],
  },
  {
    name: 'Backend service crash (ECS)',
    severity: 'High',
    steps: [
      'Detect: ECS service events show task stopped, CloudWatch 5xx alarm',
      'Assess: Check ECS task logs in CloudWatch for crash reason',
      'Recover: ECS auto-restarts tasks (desired count). Manual: force new deployment',
      'Verify: curl health endpoint, run smoke tests',
      'Escalate: If recurring, check for OOM (increase task memory) or code bug',
    ],
  },
  {
    name: 'Frontend unavailable (S3/CloudFront)',
    severity: 'High',
    steps: [
      'Detect: CloudFront 5xx error rate alarm or user reports',
      'Assess: Check S3 bucket accessibility, CloudFront distribution status',
      'Recover: Redeploy frontend (deploy.sh), invalidate CloudFront cache',
      'Verify: Access platform URL in browser',
    ],
  },
  {
    name: 'IoT data pipeline interruption',
    severity: 'Medium',
    steps: [
      'Detect: offlineAlerts Lambda detects stale meters (>4h threshold)',
      'Assess: Check IoT Core MQTT connectivity, S3 raw data flow, Lambda errors',
      'Recover: Restart iot-ingest Lambda, verify MQTT connection from device',
      'Backfill: Run backfill job for gap period (automatic via IngestModule)',
      'Verify: Check readings/latest for affected meters',
    ],
  },
  {
    name: 'Security breach / data exposure',
    severity: 'Critical',
    steps: [
      'Detect: GuardDuty alert, audit log anomaly, or external report',
      'Contain: Rotate JWT_SECRET + COOKIE_SECRET, revoke all refresh tokens',
      'Assess: Review audit_logs for unauthorized access patterns',
      'Notify: PASA within 24h (CYB-16), Ley 21.719 breach notification within 72h',
      'Remediate: Patch vulnerability, force password/MFA reset for affected users',
      'Post-mortem: Document incident, update security procedures',
    ],
  },
  {
    name: 'Full region outage (us-east-1)',
    severity: 'Critical',
    steps: [
      'Detect: AWS Health Dashboard reports regional outage',
      'Assess: Determine estimated recovery time from AWS',
      'Communicate: Notify PASA and all tenants of outage',
      'Wait: Most services auto-recover with AWS region restoration',
      'Recover (if extended): Restore RDS from cross-region snapshot (if configured)',
      'Verify: Full smoke test suite after restoration',
    ],
  },
];

/* ── Markdown generation ── */

function generateMarkdown() {
  const criticalCount = INFRA_COMPONENTS.filter(c => c.tier === 'critical').length;
  const scenarioCount = SCENARIOS.length;

  const lines = [
    '# BCP / DRP — Business Continuity & Disaster Recovery Plan',
    '',
    '> monitoreo-v2 — Energy Monitor Platform',
    `> Auto-generated by \`scripts/generate-bcp-drp.mjs\`. ${INFRA_COMPONENTS.length} components, ${scenarioCount} recovery scenarios.`,
    '> Re-generate: `npm run docs:bcp-drp`',
    '',
    '> CYB-11 (Anexo 07): Documented and tested BCP/DRP.',
    '> ARQ-11: RTO < 4 hours, RPO < 1 hour for critical components.',
    '',
    '---',
    '',
    '## 1. Infrastructure Components',
    '',
    `| Component | Tier | Region | RTO | RPO |`,
    `|-----------|------|--------|-----|-----|`,
  ];

  for (const c of INFRA_COMPONENTS) {
    lines.push(`| ${c.name} | ${c.tier} | ${c.region} | ${c.rto} | ${c.rpo} |`);
  }

  lines.push('');
  lines.push(`**Critical components:** ${criticalCount}/${INFRA_COMPONENTS.length}`);
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 2. Component Recovery Details');
  lines.push('');

  for (const c of INFRA_COMPONENTS) {
    lines.push(`### ${c.name}`);
    lines.push('');
    lines.push(`| Aspect | Detail |`);
    lines.push(`|--------|--------|`);
    lines.push(`| **Tier** | ${c.tier} |`);
    lines.push(`| **RTO** | ${c.rto} |`);
    lines.push(`| **RPO** | ${c.rpo} |`);
    lines.push(`| **Recovery** | ${c.recovery} |`);
    lines.push(`| **Backup** | ${c.backup} |`);
    lines.push(`| **Monitoring** | ${c.monitoring} |`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 3. Disaster Recovery Scenarios');
  lines.push('');

  for (const s of SCENARIOS) {
    lines.push(`### ${s.name} (${s.severity})`);
    lines.push('');
    for (let i = 0; i < s.steps.length; i++) {
      lines.push(`${i + 1}. ${s.steps[i]}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 4. Communication Plan');
  lines.push('');
  lines.push('| Audience | Channel | SLA |');
  lines.push('|----------|---------|-----|');
  lines.push('| Ops team | SNS email (CloudWatch alarms) | Immediate (automated) |');
  lines.push('| PASA (client) | Email to contact | < 24h for security (CYB-16) |');
  lines.push('| Data subjects | Platform notice + email | < 72h for breach (Ley 21.719) |');
  lines.push('| All tenants | Status page / email | < 4h for service outage |');
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 5. Testing Schedule');
  lines.push('');
  lines.push('| Test | Frequency | Method |');
  lines.push('|------|-----------|--------|');
  lines.push('| RDS backup restore | Quarterly | Restore snapshot to test instance, verify data integrity |');
  lines.push('| ECS failover | Monthly | Kill running task, verify auto-recovery |');
  lines.push('| Smoke tests | On every deploy | `npm run test:smoke-dashboard` |');
  lines.push('| IoT backfill | Monthly | Simulate gap, verify automatic backfill |');
  lines.push('| Security incident response | Annually | Tabletop exercise with team |');
  lines.push('| Full DR simulation | Annually | Restore from backups in fresh environment |');
  lines.push('');

  return lines.join('\n');
}

/* ── Main ── */

export function generate() {
  const markdown = generateMarkdown();
  return {
    markdown,
    componentCount: INFRA_COMPONENTS.length,
    scenarioCount: SCENARIOS.length,
    criticalCount: INFRA_COMPONENTS.filter(c => c.tier === 'critical').length,
    components: INFRA_COMPONENTS.map(c => c.name),
    scenarios: SCENARIOS.map(s => s.name),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const outputIdx = process.argv.indexOf('--output');
  const outputPath = outputIdx >= 0 ? resolve(process.argv[outputIdx + 1]) : DEFAULT_OUTPUT;

  const result = generate();
  writeFileSync(outputPath, result.markdown, 'utf-8');
  console.log(`BCP/DRP: ${result.componentCount} components, ${result.scenarioCount} scenarios → ${outputPath}`);
}
