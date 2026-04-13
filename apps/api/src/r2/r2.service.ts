import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * Service for interacting with Cloudflare R2 storage
 * using the S3-compatible API.
 */
@Injectable()
export class R2Service implements OnModuleInit {
  private readonly logger = new Logger(R2Service.name);
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  onModuleInit(): void {
    const accountId = process.env.R2_ACCOUNT_ID ?? '';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
    this.bucket = process.env.R2_BUCKET_NAME ?? '';
    const rawPublicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
    // Ensure the URL always has a protocol
    this.publicUrl =
      rawPublicUrl && !rawPublicUrl.startsWith('http') ? `https://${rawPublicUrl}` : rawPublicUrl;
    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn('R2 credentials are not fully configured. Media uploads will fail.');
    }
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /** Upload a buffer to R2 and return the public URL. */
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return this.getPublicUrl(key);
  }

  /** Delete a single object from R2. */
  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /** Delete multiple objects from R2. */
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }

  /** Generate a presigned PUT URL for direct browser upload. */
  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Construct the public URL for a given key. */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }
}
