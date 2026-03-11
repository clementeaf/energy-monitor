import { createHash } from 'crypto';
import { PassThrough, Transform } from 'stream';
import { pipeline } from 'stream/promises';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Upload } from '@aws-sdk/lib-storage';
import { google } from 'googleapis';

const REGION = process.env.AWS_REGION || 'us-east-1';
const DB_SECRET_NAME = process.env.DB_SECRET_NAME || 'energy-monitor/drive-ingest/db';
const GOOGLE_SECRET_NAME = process.env.GOOGLE_SECRET_NAME || 'energy-monitor/drive-ingest/google-service-account';
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1VwbEPmoB1fXvhJTDMaP_6m3bBMYLi0-V';
const S3_BUCKET = process.env.S3_BUCKET || 'energy-monitor-ingest-058310292956';
const RAW_PREFIX = process.env.S3_RAW_PREFIX || 'raw';
const MANIFEST_PREFIX = process.env.S3_MANIFEST_PREFIX || 'manifests';
const SOURCE_FILES = (process.env.SOURCE_FILES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const FORCE_DOWNLOAD = process.env.FORCE_DOWNLOAD === 'true';

const secretsClient = new SecretsManagerClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });

/**
 * Lee el manifest más reciente de S3 para un archivo y retorna su driveModifiedTime.
 * Retorna null si no existe manifest previo.
 */
async function getLastManifestModifiedTime(fileName) {
  const prefix = `${MANIFEST_PREFIX}/`;
  let continuationToken;
  let latestKey = null;
  let latestModified = null;

  // Los manifests se nombran como: manifests/<ISO-timestamp>-<fileName>.json
  // Listamos todos los objetos con ese prefix y buscamos el más reciente
  do {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const obj of (response.Contents || [])) {
      if (!obj.Key.endsWith(`-${fileName}.json`)) continue;
      if (!latestModified || obj.LastModified > latestModified) {
        latestKey = obj.Key;
        latestModified = obj.LastModified;
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  if (!latestKey) return null;

  const manifestResponse = await s3Client.send(new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: latestKey,
  }));

  const body = await manifestResponse.Body.transformToString();
  const manifest = JSON.parse(body);
  return manifest.driveModifiedTime || null;
}

async function getSecretJson(secretId) {
  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!response.SecretString) {
    throw new Error(`Secret ${secretId} does not contain SecretString`);
  }

  return JSON.parse(response.SecretString);
}

async function buildDriveClient() {
  const credentials = await getSecretJson(GOOGLE_SECRET_NAME);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

async function listFolderCsvFiles(drive) {
  const files = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: `'${DRIVE_FOLDER_ID}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'nextPageToken, files(id, name, size, modifiedTime, mimeType)',
      pageSize: 100,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const pageFiles = (response.data.files || []).filter((file) =>
      file.name?.toLowerCase().endsWith('.csv'),
    );
    files.push(...pageFiles);
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  if (SOURCE_FILES.length === 0) {
    return files;
  }

  const selectedNames = new Set(SOURCE_FILES);
  return files.filter((file) => selectedNames.has(file.name));
}

function createHashingStream(hash) {
  return new Transform({
    transform(chunk, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });
}

function buildRawKey(fileName) {
  return `${RAW_PREFIX}/${fileName}`;
}

function buildManifestKey(fileName, startedAt) {
  const safeTimestamp = startedAt.replace(/[:.]/g, '-');
  return `${MANIFEST_PREFIX}/${safeTimestamp}-${fileName}.json`;
}

async function uploadDriveFileToS3(drive, file) {
  const startedAt = new Date().toISOString();
  const rawKey = buildRawKey(file.name);
  const manifestKey = buildManifestKey(file.name, startedAt);
  const hash = createHash('sha256');
  const hashingStream = createHashingStream(hash);
  const uploadBody = new PassThrough();

  const response = await drive.files.get(
    {
      fileId: file.id,
      alt: 'media',
      supportsAllDrives: true,
    },
    {
      responseType: 'stream',
    },
  );

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: S3_BUCKET,
      Key: rawKey,
      Body: uploadBody,
      ContentType: 'text/csv',
      Metadata: {
        driveFileId: file.id,
        driveModifiedTime: file.modifiedTime || '',
      },
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
    leavePartsOnError: false,
  });

  await Promise.all([
    upload.done(),
    pipeline(response.data, hashingStream, uploadBody),
  ]);

  const completedAt = new Date().toISOString();
  const manifest = {
    fileName: file.name,
    driveFileId: file.id,
    driveFolderId: DRIVE_FOLDER_ID,
    driveModifiedTime: file.modifiedTime,
    sizeBytes: file.size ? Number(file.size) : null,
    s3Bucket: S3_BUCKET,
    s3Key: rawKey,
    status: 'uploaded',
    startedAt,
    completedAt,
    sha256: hash.digest('hex'),
  };

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: manifestKey,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: 'application/json',
  }));

  return manifest;
}

async function main() {
  await getSecretJson(DB_SECRET_NAME);

  const drive = await buildDriveClient();
  const files = await listFolderCsvFiles(drive);

  if (files.length === 0) {
    throw new Error('No CSV files found for ingestion');
  }

  console.log(`Found ${files.length} CSV file(s) in Google Drive folder ${DRIVE_FOLDER_ID}`);
  if (FORCE_DOWNLOAD) {
    console.log('[force] FORCE_DOWNLOAD=true — skipping change detection, all files will be downloaded');
  }

  const manifests = [];
  const skipped = [];

  for (const file of files) {
    if (!FORCE_DOWNLOAD) {
      const lastModifiedTime = await getLastManifestModifiedTime(file.name);
      if (lastModifiedTime && lastModifiedTime === file.modifiedTime) {
        console.log(`[skip] ${file.name} — no changes since last ingest (driveModifiedTime: ${file.modifiedTime})`);
        skipped.push(file.name);
        continue;
      }
      if (lastModifiedTime) {
        console.log(`[changed] ${file.name} — previous: ${lastModifiedTime}, current: ${file.modifiedTime}`);
      } else {
        console.log(`[new] ${file.name} — no previous manifest found`);
      }
    }

    console.log(`Uploading ${file.name} (${file.size || 'unknown'} bytes) to s3://${S3_BUCKET}/${buildRawKey(file.name)}`);
    const manifest = await uploadDriveFileToS3(drive, file);
    manifests.push(manifest);
    console.log(`Completed ${file.name}`);
  }

  console.log(JSON.stringify({
    uploadedFiles: manifests.length,
    skippedFiles: skipped.length,
    skipped,
    bucket: S3_BUCKET,
    files: manifests,
  }, null, 2));
}

main().catch((error) => {
  console.error('[drive-ingest]', error);
  process.exit(1);
});