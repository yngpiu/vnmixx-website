import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadGatewayException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Service tương tác với lưu trữ Cloudflare R2 thông qua API tương thích S3.
 * Cung cấp các chức năng tải lên, xóa và tạo URL tạm thời để upload file.
 */
@Injectable()
export class R2Service implements OnModuleInit {
  private readonly logger = new Logger(R2Service.name);
  private client!: S3Client;
  private bucket: string;
  private publicUrl: string;
  private isConfigured = false;

  /**
   * Khởi tạo cấu hình S3 Client dựa trên thông tin R2 từ biến môi trường.
   */
  onModuleInit(): void {
    const accountId = process.env.R2_ACCOUNT_ID ?? '';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID ?? '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY ?? '';
    this.bucket = process.env.R2_BUCKET_NAME ?? '';
    const rawPublicUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');

    // Đảm bảo URL luôn có giao thức (http/https)
    this.publicUrl =
      rawPublicUrl && !rawPublicUrl.startsWith('http') ? `https://${rawPublicUrl}` : rawPublicUrl;

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucket || !this.publicUrl) {
      this.isConfigured = false;
      this.logger.error('R2 credentials are not fully configured. Media operations are disabled.');
      return;
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.isConfigured = true;
  }

  /**
   * Tải một file lên R2 từ Buffer và trả về URL công khai của file đó.
   */
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    this.assertConfigured();
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
      return this.getPublicUrl(key);
    } catch (error) {
      this.logger.error(
        `Failed to upload file "${key}" to R2: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('Không thể tải tệp lên hệ thống lưu trữ. Vui lòng thử lại.');
    }
  }

  /**
   * Xóa một file duy nhất khỏi R2 dựa trên key.
   */
  async deleteFile(key: string): Promise<void> {
    this.assertConfigured();
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete file "${key}" from R2: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('Không thể xóa tệp trên hệ thống lưu trữ.');
    }
  }

  /**
   * Xóa nhiều file cùng lúc khỏi R2.
   */
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    this.assertConfigured();
    try {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete ${keys.length} file(s) from R2: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('Không thể xóa nhiều tệp trên hệ thống lưu trữ.');
    }
  }

  /**
   * Tạo một URL tạm thời (presigned URL) để cho phép client upload file trực tiếp lên R2.
   */
  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 600): Promise<string> {
    this.assertConfigured();
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to create presigned URL for "${key}": ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('Không thể tạo URL tải tệp tạm thời.');
    }
  }

  /**
   * Xây dựng URL công khai cho một file dựa trên key.
   */
  getPublicUrl(key: string): string {
    this.assertConfigured();
    return `${this.publicUrl}/${key}`;
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('Dịch vụ lưu trữ tệp chưa được cấu hình.');
    }
  }
}
