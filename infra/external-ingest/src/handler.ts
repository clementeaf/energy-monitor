import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3 = new S3Client({ region: 'us-east-1' });
const BUCKET = process.env.INGEST_BUCKET!;
const PREFIX = process.env.INGEST_PREFIX || 'raw/external';

// ── Helpers ──────────────────────────────────────────────

interface ApiEvent {
  headers: Record<string, string | undefined>;
  body?: string | null;
  isBase64Encoded?: boolean;
  queryStringParameters?: Record<string, string | undefined> | null;
  requestContext?: { http?: { method: string } };
}

interface ApiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const json = (statusCode: number, data: unknown): ApiResponse => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

const today = () => new Date().toISOString().slice(0, 10);

const detectExtension = (contentType?: string): string => {
  const map: Record<string, string> = {
    'application/json': 'json',
    'text/csv': 'csv',
    'text/plain': 'txt',
    'application/xml': 'xml',
    'text/xml': 'xml',
    'application/octet-stream': 'bin',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xls',
    'application/zip': 'zip',
    'application/gzip': 'gz',
  };
  if (!contentType) return 'bin';
  const base = contentType.split(';')[0].trim().toLowerCase();
  return map[base] || 'bin';
};

// ── POST /ingest ─────────────────────────────────────────
// Accepts ANY payload. Stores raw in S3.
// Headers used:
//   x-source-id  (optional) — identifies the sender (e.g. "empresa-xyz")
//   x-file-name  (optional) — original filename
//   content-type  — used to detect extension

export const ingest = async (event: ApiEvent): Promise<ApiResponse> => {
  try {
    const contentType = event.headers['content-type'] || event.headers['Content-Type'];
    const sourceId = (event.headers['x-source-id'] || event.headers['X-Source-Id'] || 'unknown')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 64);
    const originalName = event.headers['x-file-name'] || event.headers['X-File-Name'] || null;

    // Decode body
    let bodyBuffer: Buffer;
    if (event.isBase64Encoded && event.body) {
      bodyBuffer = Buffer.from(event.body, 'base64');
    } else if (event.body) {
      bodyBuffer = Buffer.from(event.body, 'utf-8');
    } else {
      return json(400, { error: 'Empty body' });
    }

    if (bodyBuffer.length === 0) {
      return json(400, { error: 'Empty body' });
    }

    const ext = detectExtension(contentType);
    const id = randomUUID();
    const key = `${PREFIX}/${sourceId}/${today()}/${id}.${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: bodyBuffer,
      ContentType: contentType || 'application/octet-stream',
      Metadata: {
        'source-id': sourceId,
        'received-at': new Date().toISOString(),
        'original-size': String(bodyBuffer.length),
        ...(originalName ? { 'original-name': originalName } : {}),
      },
    }));

    return json(200, {
      ok: true,
      key,
      id,
      size: bodyBuffer.length,
      contentType: contentType || 'application/octet-stream',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Ingest error:', message);
    return json(500, { error: 'Internal error' });
  }
};

// ── POST /ingest/upload-url ──────────────────────────────
// For files > 10MB. Returns a presigned PUT URL (valid 1 hour).
// Body (JSON): { sourceId?, fileName?, contentType? }

export const uploadUrl = async (event: ApiEvent): Promise<ApiResponse> => {
  try {
    let params: { sourceId?: string; fileName?: string; contentType?: string } = {};

    if (event.body) {
      try {
        const raw = event.isBase64Encoded
          ? Buffer.from(event.body, 'base64').toString('utf-8')
          : event.body;
        params = JSON.parse(raw);
      } catch {
        // fine, use defaults
      }
    }

    const sourceId = (params.sourceId || 'unknown')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 64);
    const contentType = params.contentType || 'application/octet-stream';
    const ext = detectExtension(contentType);
    const id = randomUUID();
    const key = `${PREFIX}/${sourceId}/${today()}/${id}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      Metadata: {
        'source-id': sourceId,
        'received-at': new Date().toISOString(),
        ...(params.fileName ? { 'original-name': params.fileName } : {}),
      },
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return json(200, {
      ok: true,
      uploadUrl: url,
      key,
      id,
      expiresIn: 3600,
      method: 'PUT',
      contentType,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Upload URL error:', message);
    return json(500, { error: 'Internal error' });
  }
};

// ── GET /ingest/status ───────────────────────────────────

export const status = async (): Promise<ApiResponse> => {
  return json(200, {
    ok: true,
    service: 'external-ingest',
    timestamp: new Date().toISOString(),
  });
};
