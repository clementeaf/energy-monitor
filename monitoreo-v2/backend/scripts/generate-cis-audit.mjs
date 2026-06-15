#!/usr/bin/env node

/**
 * CYB-17 — CIS Benchmarks hardening audit checklist.
 * Generates docs/ops/cis-hardening-audit.md
 *
 * Covers: ECS Fargate, RDS PostgreSQL, S3, CloudFront, IAM.
 * Based on CIS AWS Foundations Benchmark v3.0 + CIS Docker Benchmark v1.6.
 *
 * Usage: node scripts/generate-cis-audit.mjs
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const OUTPUT = resolve(import.meta.dirname, '..', '..', 'docs', 'ops', 'cis-hardening-audit.md');

const checks = [
  {
    category: 'ECS Fargate',
    items: [
      { id: 'ECS-01', control: 'Task definition uses non-root user', status: 'OK', notes: 'Dockerfile: USER node' },
      { id: 'ECS-02', control: 'Read-only root filesystem', status: 'OK', notes: 'readonlyRootFilesystem: true in task def' },
      { id: 'ECS-03', control: 'No privileged containers', status: 'OK', notes: 'Fargate does not allow privileged mode' },
      { id: 'ECS-04', control: 'CloudWatch logs enabled', status: 'OK', notes: 'awslogs driver configured' },
      { id: 'ECS-05', control: 'Task role follows least privilege', status: 'REVIEW', notes: 'Review task role policy quarterly' },
      { id: 'ECS-06', control: 'Platform version is latest', status: 'OK', notes: 'LATEST (1.4.0+)' },
      { id: 'ECS-07', control: 'Secrets via SSM/Secrets Manager, not env vars', status: 'REVIEW', notes: 'DB_PASSWORD via env — migrate to Secrets Manager' },
      { id: 'ECS-08', control: 'Network mode awsvpc with security groups', status: 'OK', notes: 'Fargate requires awsvpc' },
    ],
  },
  {
    category: 'RDS PostgreSQL',
    items: [
      { id: 'RDS-01', control: 'Encryption at rest enabled', status: 'OK', notes: 'StorageEncrypted: true (AES-256)' },
      { id: 'RDS-02', control: 'SSL/TLS enforced for connections', status: 'OK', notes: 'rds.force_ssl=1, rejectUnauthorized: true' },
      { id: 'RDS-03', control: 'Not publicly accessible', status: 'OK', notes: 'PubliclyAccessible: false' },
      { id: 'RDS-04', control: 'Automated backups enabled', status: 'OK', notes: 'BackupRetentionPeriod: 7 days' },
      { id: 'RDS-05', control: 'Minor version auto-upgrade', status: 'OK', notes: 'AutoMinorVersionUpgrade: true' },
      { id: 'RDS-06', control: 'Enhanced monitoring enabled', status: 'REVIEW', notes: 'Enable Performance Insights' },
      { id: 'RDS-07', control: 'Deletion protection enabled', status: 'OK', notes: 'DeletionProtection: true' },
      { id: 'RDS-08', control: 'Multi-AZ for production', status: 'REVIEW', notes: 'Currently single-AZ — upgrade for HA' },
      { id: 'RDS-09', control: 'Database audit logging', status: 'OK', notes: 'pgaudit or audit_logs hypertable' },
    ],
  },
  {
    category: 'S3',
    items: [
      { id: 'S3-01', control: 'Block public access enabled', status: 'OK', notes: 'BlockPublicAcls + RestrictPublicBuckets' },
      { id: 'S3-02', control: 'Server-side encryption', status: 'OK', notes: 'SSE-S3 (AES-256)' },
      { id: 'S3-03', control: 'Versioning enabled', status: 'OK', notes: 'Frontend + data buckets' },
      { id: 'S3-04', control: 'Access logging enabled', status: 'REVIEW', notes: 'Enable server access logging to audit bucket' },
      { id: 'S3-05', control: 'Lifecycle policies configured', status: 'OK', notes: 'Export jobs purged after 90 days' },
    ],
  },
  {
    category: 'CloudFront',
    items: [
      { id: 'CF-01', control: 'HTTPS only (redirect HTTP)', status: 'OK', notes: 'ViewerProtocolPolicy: redirect-to-https' },
      { id: 'CF-02', control: 'TLS 1.2 minimum', status: 'OK', notes: 'MinimumProtocolVersion: TLSv1.2_2021' },
      { id: 'CF-03', control: 'WAF associated', status: 'REVIEW', notes: 'Script ready — run 01-waf-setup.sh (CYB-09)' },
      { id: 'CF-04', control: 'Access logging enabled', status: 'REVIEW', notes: 'Enable standard logging to S3' },
    ],
  },
  {
    category: 'IAM / Access',
    items: [
      { id: 'IAM-01', control: 'Root account MFA enabled', status: 'OK', notes: 'Verified in console' },
      { id: 'IAM-02', control: 'No root access keys', status: 'OK', notes: 'No root access keys exist' },
      { id: 'IAM-03', control: 'IAM roles use least privilege', status: 'REVIEW', notes: 'Quarterly review checklist in security-processes.md' },
      { id: 'IAM-04', control: 'CloudTrail enabled in all regions', status: 'OK', notes: 'Multi-region trail active' },
      { id: 'IAM-05', control: 'Password policy enforced', status: 'OK', notes: 'OAuth-only — no IAM console passwords for app users' },
    ],
  },
];

const lines = [
  '# CIS Hardening Audit — Energy Monitor Platform',
  '',
  `> Generated: ${new Date().toISOString().slice(0, 10)}`,
  '> Based on: CIS AWS Foundations Benchmark v3.0, CIS Docker Benchmark v1.6',
  '',
  '## Summary',
  '',
];

let totalOk = 0;
let totalReview = 0;

for (const cat of checks) {
  const ok = cat.items.filter((i) => i.status === 'OK').length;
  const review = cat.items.filter((i) => i.status === 'REVIEW').length;
  totalOk += ok;
  totalReview += review;
  lines.push(`| ${cat.category} | ${ok} OK | ${review} REVIEW | ${cat.items.length} total |`);
}

lines.push('', `**Total: ${totalOk} OK, ${totalReview} REVIEW, ${totalOk + totalReview} checks**`, '');

for (const cat of checks) {
  lines.push(`## ${cat.category}`, '');
  lines.push('| ID | Control | Status | Notes |');
  lines.push('|----|---------|--------|-------|');
  for (const item of cat.items) {
    const badge = item.status === 'OK' ? '✅ OK' : '🔍 REVIEW';
    lines.push(`| ${item.id} | ${item.control} | ${badge} | ${item.notes} |`);
  }
  lines.push('');
}

lines.push('## Remediation Plan', '');
lines.push('| Priority | ID | Action |');
lines.push('|----------|----|--------|');

for (const cat of checks) {
  for (const item of cat.items) {
    if (item.status === 'REVIEW') {
      lines.push(`| Medium | ${item.id} | ${item.notes} |`);
    }
  }
}

lines.push('');
const md = lines.join('\n');
writeFileSync(OUTPUT, md);
console.log(`[cis-audit] Written: ${OUTPUT} (${checks.reduce((s, c) => s + c.items.length, 0)} checks)`);
