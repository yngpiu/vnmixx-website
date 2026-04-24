import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadGatewayException,
  HttpException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
// Đóng gói thao tác upload/xóa/presign URL với Cloudflare R2.
export class R2Service implements OnModuleInit {
  private readonly logger = new Logger(R2Service.name);
  private client!: S3Client;
  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID');
    this.accessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID');
    this.secretAccessKey = this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');
    const rawPublicUrl = this.config.getOrThrow<string>('R2_PUBLIC_URL').replace(/\/+$/, '');
    this.publicUrl =
      rawPublicUrl && !rawPublicUrl.startsWith('http') ? `https://${rawPublicUrl}` : rawPublicUrl;
  }

  // Khởi tạo S3 client từ cấu hình R2 trong biến môi trường.
  onModuleInit(): void {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey },
    });
  }

  // Tải file lên R2 và trả về URL public.
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
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
      this.handleStorageError('upload', error, key);
    }
  }

  // Xóa một file theo key trên R2.
  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      this.handleStorageError('delete', error, key);
    }
  }

  // Xóa nhiều file cùng lúc trên R2.
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
      );
    } catch (error) {
      this.handleStorageError('deleteMany', error, `${keys.length} objects`);
    }
  }

  // Tạo presigned URL để client upload trực tiếp lên R2.
  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      this.handleStorageError('presignUpload', error, key);
    }
  }

  // Build URL public từ key file.
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  // Chuẩn hóa lỗi storage thành HttpException nhất quán cho API.
  private handleStorageError(operation: string, error: unknown, target: string): never {
    this.logger.error(
      `R2 ${operation} failed for "${target}": ${error instanceof Error ? error.message : String(error)}`,
    );
    if (error instanceof HttpException) {
      throw error;
    }
    switch (operation) {
      case 'upload':
        throw new BadGatewayException('Không thể tải tệp lên hệ thống lưu trữ. Vui lòng thử lại.');
      case 'delete':
        throw new BadGatewayException('Không thể xóa tệp trên hệ thống lưu trữ.');
      case 'deleteMany':
        throw new BadGatewayException('Không thể xóa nhiều tệp trên hệ thống lưu trữ.');
      default:
        throw new BadGatewayException('Không thể tạo URL tải tệp tạm thời.');
    }
  }
}
