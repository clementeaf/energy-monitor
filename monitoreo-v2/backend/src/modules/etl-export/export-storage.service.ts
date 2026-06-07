import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StoredExportFile {
  s3Key: string | null;
  localPath: string | null;
}

/**
 * Persists export artifacts to S3 (prod) or local disk (dev).
 */
@Injectable()
export class ExportStorageService {
  private readonly s3: S3Client | null;

  constructor(private readonly configService: ConfigService) {
    const bucket = this.configService.get<string>('EXPORT_S3_BUCKET');
    this.s3 = bucket
      ? new S3Client({ region: this.configService.get<string>('AWS_REGION', 'us-east-1') })
      : null;
  }

  /**
   * Stores export bytes and returns storage location metadata.
   * @param key - Object key relative path
   * @param body - File contents
   * @returns S3 key and/or local path
   */
  async putFile(key: string, body: Buffer): Promise<StoredExportFile> {
    const bucket = this.configService.get<string>('EXPORT_S3_BUCKET');
    if (bucket && this.s3) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: key.endsWith('.parquet')
            ? 'application/octet-stream'
            : 'text/csv; charset=utf-8',
        }),
      );
      return { s3Key: key, localPath: null };
    }

    const dir = this.configService.get<string>('EXPORT_LOCAL_DIR', '/tmp/energy-monitor-exports');
    const localPath = path.join(dir, key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, body);
    return { s3Key: null, localPath };
  }

  /**
   * Creates a presigned download URL when S3 is configured.
   * @param s3Key - S3 object key
   * @returns Signed URL or null for local storage
   */
  async getSignedDownloadUrl(s3Key: string): Promise<string | null> {
    const bucket = this.configService.get<string>('EXPORT_S3_BUCKET');
    if (!bucket || !this.s3) return null;

    return getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: s3Key }),
      { expiresIn: 3600 },
    );
  }

  /**
   * Reads a locally stored export file.
   * @param localPath - Absolute path on disk
   * @returns File buffer
   */
  readLocalFile(localPath: string): Buffer {
    return fs.readFileSync(localPath);
  }
}
