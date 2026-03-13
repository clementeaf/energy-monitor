#!/usr/bin/env node
/**
 * Sube los XLSX de docs/porCargar a S3 (prefijo billing/).
 * Requiere credenciales AWS (env o ~/.aws/credentials).
 *
 * Uso: node scripts/upload-porcargar-to-s3.mjs [--bucket NAME] [--prefix PREFIX]
 *      --bucket  (opcional) Bucket S3; default: energy-monitor-ingest-058310292956
 *      --prefix  (opcional) Prefijo dentro del bucket; default: billing
 */

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIR = join(ROOT, 'docs/porCargar');

const REGION = process.env.AWS_REGION || 'us-east-1';

const args = process.argv.slice(2);
let bucket = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
let prefix = process.env.S3_PREFIX || 'billing';

for (const arg of args) {
  if (arg.startsWith('--bucket=')) bucket = arg.slice(9);
  else if (arg.startsWith('--prefix=')) prefix = arg.slice(9);
}

const s3 = new S3Client({ region: REGION });

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function main() {
  const entries = await readdir(DIR, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.xlsx'))
    .map((e) => e.name)
    .sort();

  if (files.length === 0) {
    console.error('No se encontraron archivos .xlsx en docs/porCargar');
    process.exit(1);
  }

  console.error(`Subiendo ${files.length} archivos a s3://${bucket}/${prefix}/`);
  for (const name of files) {
    const path = join(DIR, name);
    const body = await readFile(path);
    const key = prefix.endsWith('/') ? `${prefix}${name}` : `${prefix}/${name}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: XLSX_CONTENT_TYPE,
      }),
    );
    console.error(`  OK ${key}`);
  }
  console.error('Listo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
