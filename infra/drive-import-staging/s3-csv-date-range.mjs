/**
 * Muestra la primera y última fecha (timestamp) de un CSV en S3 sin cargar el archivo entero.
 * Uso: S3_KEY=raw/MALL_GRANDE_446_completo.csv node s3-csv-date-range.mjs
 *      [S3_BUCKET=...] [AWS_REGION=...]
 */

import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

const REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const S3_KEY = process.env.S3_KEY || '';

const SAMPLE_BYTES = 80_000;
const s3 = new S3Client({ region: REGION });

function extractFirstTimestamp(chunk) {
  const text = chunk.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;
  const header = lines[0];
  const tsIdx = header.split(';').findIndex((c) => c.trim().replace(/^\uFEFF/, '') === 'timestamp');
  if (tsIdx === -1) return null;
  const firstData = lines[1].split(';')[tsIdx];
  return firstData ? firstData.trim() : null;
}

function extractLastTimestamp(chunk) {
  const text = chunk.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return null;
  const lastLine = lines[lines.length - 1];
  const parts = lastLine.split(';');
  const firstCol = parts[0] ? parts[0].trim() : '';
  if (/^\d{4}-\d{2}-\d{2}/.test(firstCol)) return firstCol;
  const tsIdx = parts.findIndex((p) => /^\d{4}-\d{2}-\d{2}/.test((p || '').trim()));
  return tsIdx >= 0 ? parts[tsIdx].trim() : null;
}

async function main() {
  if (!S3_KEY) {
    console.error('Define S3_KEY (ej: S3_KEY=raw/MALL_GRANDE_446_completo.csv)');
    process.exit(1);
  }

  const head = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: S3_KEY }));
  const totalBytes = head.ContentLength || 0;

  const [headChunk, tailChunk] = await Promise.all([
    s3.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Range: `bytes=0-${SAMPLE_BYTES - 1}`,
    })),
    s3.send(new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Range: `bytes=${Math.max(0, totalBytes - SAMPLE_BYTES)}-`,
    })),
  ]);

  const headBuf = await headChunk.Body.transformToByteArray();
  const tailBuf = await tailChunk.Body.transformToByteArray();

  const firstTs = extractFirstTimestamp(Buffer.from(headBuf));
  const lastTs = extractLastTimestamp(Buffer.from(tailBuf));

  console.log(JSON.stringify({
    bucket: S3_BUCKET,
    key: S3_KEY,
    sizeBytes: totalBytes,
    firstTimestamp: firstTs,
    lastTimestamp: lastTs,
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
