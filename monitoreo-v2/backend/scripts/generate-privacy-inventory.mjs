#!/usr/bin/env node
/**
 * PRI-06 + PRI-07: Generate PII field inventory and sub-processors list.
 *
 * Usage:
 *   node scripts/generate-privacy-inventory.mjs [--output-pii path] [--output-sub path]
 *
 * PRI-06: Scans entity files for columns matching PII/sensitive patterns.
 * PRI-07: Catalogs known third-party sub-processors from infra and deps.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(__dirname, '..', 'src');
const PRIVACY_DIR = resolve(__dirname, '..', '..', 'docs', 'privacy');
const DEFAULT_PII_OUTPUT = resolve(PRIVACY_DIR, 'pii-field-inventory.md');
const DEFAULT_SUB_OUTPUT = resolve(PRIVACY_DIR, 'sub-processors.md');

/* ═══════════════════════════════════════════════════════════
 *  PRI-06 — PII Field Inventory
 * ═══════════════════════════════════════════════════════════ */

/** Classification rules: column name pattern → category + description */
const PII_RULES = [
  // Personal data (Ley 21.719 Art. 2)
  { pattern: /^email$|^email_hmac$|^contact_email$/, category: 'personal', label: 'Email address', basis: 'Consent / Contractual', retention: 'Active account + 2yr anonymization' },
  { pattern: /^display_name$|^name$/, category: 'personal', label: 'Person name', basis: 'Consent / Contractual', retention: 'Active account + 2yr anonymization', test: (table) => ['users', 'user_import_staging_rows'].includes(table) },
  { pattern: /^phone$/, category: 'personal', label: 'Phone number', basis: 'Consent', retention: 'Active account + 2yr anonymization' },
  { pattern: /^auth_provider_id$/, category: 'personal', label: 'OAuth provider ID', basis: 'Contractual (SSO)', retention: 'Active account' },

  // Sensitive data (security credentials)
  { pattern: /^mfa_secret$/, category: 'sensitive', label: 'TOTP shared secret', basis: 'Security', retention: 'Until MFA disabled' },
  { pattern: /^mfa_recovery_codes$/, category: 'sensitive', label: 'MFA recovery codes', basis: 'Security', retention: 'Until MFA disabled' },
  { pattern: /^token_hash$|^secret_hash$|^key_hash$/, category: 'sensitive', label: 'Credential hash', basis: 'Security', retention: '30d after revocation' },
  { pattern: /^encrypted_client_secret$/, category: 'sensitive', label: 'Encrypted OAuth secret', basis: 'Security', retention: 'SSO config lifetime' },
  { pattern: /^scim_webhook_secret$/, category: 'sensitive', label: 'SCIM webhook secret', basis: 'Security', retention: 'SSO config lifetime' },

  // Confidential (business / operational PII-adjacent)
  { pattern: /^ip_address$/, category: 'confidential', label: 'IP address', basis: 'Legitimate interest (security)', retention: '12 months (audit)' },
  { pattern: /^user_agent$/, category: 'confidential', label: 'Browser user-agent', basis: 'Legitimate interest (security)', retention: '30d token cleanup' },
  { pattern: /^last_login_at$/, category: 'confidential', label: 'Last login timestamp', basis: 'Legitimate interest', retention: 'Active account' },
  { pattern: /^privacy_accepted_at$|^privacy_policy_version$/, category: 'confidential', label: 'Consent record', basis: 'Legal obligation (Ley 21.719)', retention: '5 years after revocation' },
  { pattern: /^block_reason$|^blocked_at$/, category: 'confidential', label: 'Processing block record', basis: 'Legal obligation (ARCO+)', retention: 'Until unblocked + audit' },
  { pattern: /^reason$/, category: 'confidential', label: 'User-provided reason', basis: 'Contractual', retention: 'Request lifecycle', test: (table) => table.includes('request') },
];

/* ── File discovery ── */

function collectEntityFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectEntityFiles(full));
      continue;
    }
    if (entry.name.endsWith('.entity.ts') && !entry.name.endsWith('.spec.ts')) {
      results.push(full);
    }
  }
  return results.sort();
}

/* ── Entity parsing (lightweight — only need table name + column names) ── */

const ENTITY_RE = /@Entity\(\s*['"]([^'"]+)['"]\s*\)/;
const COL_NAME_RE = /name:\s*['"]([^'"]+)['"]/;

function parseEntityColumns(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const entityMatch = source.match(ENTITY_RE);
  if (!entityMatch) return null;

  const tableName = entityMatch[1];
  const columns = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isCol = line.includes('@Column(') || line.includes('@CreateDateColumn(') || line.includes('@UpdateDateColumn(') || line.includes('@PrimaryColumn(');
    if (!isCol) continue;

    // Multi-line: find the property name (next non-decorator line)
    let colName = null;
    const nameMatch = line.match(COL_NAME_RE);
    if (nameMatch) {
      colName = nameMatch[1];
    } else {
      // Look forward for property declaration
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const propLine = lines[j].trim();
        if (propLine.startsWith('@')) continue;
        const propMatch = propLine.match(/^(\w+).*!?:/);
        if (propMatch) {
          // Convert camelCase to snake_case
          colName = propMatch[1].replace(/[A-Z]/g, m => '_' + m.toLowerCase());
          break;
        }
      }
    }

    if (colName) columns.push(colName);
  }

  return { tableName, columns, file: relative(SRC_DIR, filePath) };
}

/* ── Classification ── */

function classifyColumns(entities) {
  const findings = [];

  for (const entity of entities) {
    for (const col of entity.columns) {
      for (const rule of PII_RULES) {
        if (!rule.pattern.test(col)) continue;
        if (rule.test && !rule.test(entity.tableName)) continue;
        findings.push({
          table: entity.tableName,
          column: col,
          category: rule.category,
          label: rule.label,
          basis: rule.basis,
          retention: rule.retention,
          file: entity.file,
        });
        break; // first matching rule wins
      }
    }
  }

  return findings.sort((a, b) => a.category.localeCompare(b.category) || a.table.localeCompare(b.table));
}

/* ── PII Markdown ── */

function generatePiiMarkdown(findings, entityCount) {
  const byCategory = new Map();
  for (const f of findings) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  const lines = [
    '# PII Field Inventory — monitoreo-v2',
    '',
    `> Auto-generated by \`scripts/generate-privacy-inventory.mjs\` from ${entityCount} entities.`,
    `> ${findings.length} fields classified across ${byCategory.size} categories.`,
    '> Re-generate: `npm run privacy:inventory`',
    '',
    '> Ley 21.719 (Chile) requires maintaining an inventory of personal data fields,',
    '> their processing basis, and retention policies.',
    '',
    '## Summary',
    '',
    '| Category | Count | Description |',
    '|----------|------:|-------------|',
    `| Personal | ${byCategory.get('personal')?.length ?? 0} | Identifiable data (name, email, phone, OAuth ID) |`,
    `| Sensitive | ${byCategory.get('sensitive')?.length ?? 0} | Security credentials (MFA secrets, token hashes) |`,
    `| Confidential | ${byCategory.get('confidential')?.length ?? 0} | Operational PII-adjacent (IP, user-agent, consent records) |`,
    '',
  ];

  const ORDER = ['personal', 'sensitive', 'confidential'];
  const TITLES = { personal: 'Personal Data', sensitive: 'Sensitive / Security Data', confidential: 'Confidential / Operational Data' };

  for (const cat of ORDER) {
    const group = byCategory.get(cat);
    if (!group) continue;

    lines.push('---');
    lines.push('');
    lines.push(`## ${TITLES[cat]}`);
    lines.push('');
    lines.push('| Table | Column | Label | Legal Basis | Retention | Source |');
    lines.push('|-------|--------|-------|-------------|-----------|--------|');

    for (const f of group) {
      lines.push(`| ${f.table} | \`${f.column}\` | ${f.label} | ${f.basis} | ${f.retention} | \`${f.file}\` |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/* ═══════════════════════════════════════════════════════════
 *  PRI-07 — Sub-Processors Inventory
 * ═══════════════════════════════════════════════════════════ */

const SUB_PROCESSORS = [
  {
    name: 'Amazon Web Services (AWS)',
    services: 'ECS Fargate, RDS PostgreSQL, S3, CloudFront, API Gateway, IoT Core, SES, SNS, CloudWatch, ECR, EventBridge',
    purpose: 'Application hosting, database, storage, CDN, email, SMS, monitoring, IoT ingestion',
    country: 'United States (us-east-1)',
    safeguards: 'AWS DPA, SOC 2, ISO 27001, encryption at rest (AES-256) and in transit (TLS 1.2+)',
    dataTypes: 'All platform data (readings, user PII encrypted, audit logs, session tokens)',
  },
  {
    name: 'Microsoft Azure AD',
    services: 'OAuth 2.0 / OpenID Connect, MSAL',
    purpose: 'User authentication (SSO) for enterprise tenants',
    country: 'United States / Global',
    safeguards: 'Microsoft DPA, SOC 2, ISO 27001. Only auth tokens exchanged — no PII stored by Microsoft on behalf of platform',
    dataTypes: 'OAuth tokens, user email (for identity matching), provider ID',
  },
  {
    name: 'Google Cloud (Identity)',
    services: 'Google Sign-In, OAuth 2.0, JWKS',
    purpose: 'User authentication (OAuth login)',
    country: 'United States / Global',
    safeguards: 'Google DPA, SOC 2, ISO 27001. Only auth tokens exchanged',
    dataTypes: 'OAuth tokens, user email (for identity matching), provider ID',
  },
  {
    name: 'GitHub',
    services: 'GitHub Repositories, GitHub Actions',
    purpose: 'Source code hosting, CI/CD pipeline',
    country: 'United States',
    safeguards: 'GitHub DPA, SOC 2. No production data — source code only',
    dataTypes: 'Source code, build artifacts, deployment scripts',
  },
  {
    name: 'Docker Hub / AWS ECR',
    services: 'Container registry',
    purpose: 'Docker image storage for deployments',
    country: 'United States',
    safeguards: 'Images contain compiled code only — no PII. ECR lifecycle policy (5 images)',
    dataTypes: 'Docker images (compiled application code)',
  },
  {
    name: 'Siemens (IoT Core)',
    services: 'POC3000 MQTT telemetry',
    purpose: 'Energy meter data ingestion via MQTT over TLS',
    country: 'Device on-premise (Chile) → AWS IoT Core (us-east-1)',
    safeguards: 'TLS mutual auth, X.509 certificates, IoT Core policy scoped to powercenter/* topic',
    dataTypes: 'Electrical measurements (voltage, current, power, energy) — no PII',
  },
];

function generateSubProcessorsMarkdown() {
  const lines = [
    '# Sub-Processors Inventory — monitoreo-v2',
    '',
    '> Ley 21.719 (Chile) Art. 15: Data controller must inform data subjects of sub-processors.',
    '> PRI-07: Updated list of sub-processors with service, purpose, country, and safeguards.',
    '',
    `> ${SUB_PROCESSORS.length} sub-processors cataloged. Last updated: ${new Date().toISOString().slice(0, 10)}.`,
    '> Re-generate: `npm run privacy:inventory`',
    '',
    '## Sub-Processors',
    '',
  ];

  for (const sp of SUB_PROCESSORS) {
    lines.push(`### ${sp.name}`);
    lines.push('');
    lines.push(`| Aspect | Detail |`);
    lines.push(`|--------|--------|`);
    lines.push(`| **Services** | ${sp.services} |`);
    lines.push(`| **Purpose** | ${sp.purpose} |`);
    lines.push(`| **Country / Region** | ${sp.country} |`);
    lines.push(`| **Safeguards** | ${sp.safeguards} |`);
    lines.push(`| **Data Types** | ${sp.dataTypes} |`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Data Flow Summary');
  lines.push('');
  lines.push('```');
  lines.push('User browser → CloudFront (CDN) → API Gateway → ECS Fargate (NestJS)');
  lines.push('  → RDS PostgreSQL (encrypted at rest, PII encrypted at app layer)');
  lines.push('  → S3 (CSV imports, backups)');
  lines.push('');
  lines.push('Siemens POC3000 → MQTT/TLS → AWS IoT Core → S3 → Lambda → RDS');
  lines.push('');
  lines.push('Auth: Microsoft/Google OAuth → JWT cookies (httpOnly, __Host- prefix)');
  lines.push('Email: AWS SES (invitations, alerts)');
  lines.push('SMS: AWS SNS (optional invitations)');
  lines.push('```');
  lines.push('');

  return lines.join('\n');
}

/* ═══════════════════════════════════════════════════════════
 *  Main
 * ═══════════════════════════════════════════════════════════ */

export function generate(srcDir = SRC_DIR) {
  const files = collectEntityFiles(srcDir);
  const entities = [];

  for (const file of files) {
    const parsed = parseEntityColumns(file);
    if (parsed) entities.push(parsed);
  }

  const findings = classifyColumns(entities);
  const piiMarkdown = generatePiiMarkdown(findings, entities.length);
  const subMarkdown = generateSubProcessorsMarkdown();

  return {
    piiMarkdown,
    subMarkdown,
    piiFieldCount: findings.length,
    entityCount: entities.length,
    categories: [...new Set(findings.map(f => f.category))].sort(),
    subProcessorCount: SUB_PROCESSORS.length,
    tables: [...new Set(findings.map(f => f.table))].sort(),
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const piiIdx = process.argv.indexOf('--output-pii');
  const subIdx = process.argv.indexOf('--output-sub');
  const piiPath = piiIdx >= 0 ? resolve(process.argv[piiIdx + 1]) : DEFAULT_PII_OUTPUT;
  const subPath = subIdx >= 0 ? resolve(process.argv[subIdx + 1]) : DEFAULT_SUB_OUTPUT;

  const result = generate();
  writeFileSync(piiPath, result.piiMarkdown, 'utf-8');
  writeFileSync(subPath, result.subMarkdown, 'utf-8');
  console.log(`PRI-06 PII inventory: ${result.piiFieldCount} fields from ${result.entityCount} entities → ${piiPath}`);
  console.log(`PRI-07 Sub-processors: ${result.subProcessorCount} processors → ${subPath}`);
}
