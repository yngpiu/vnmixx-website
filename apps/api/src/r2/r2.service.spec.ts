import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Test, TestingModule } from '@nestjs/testing';
import { R2Service } from './r2.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('R2Service', () => {
  let service: R2Service;
  let s3Client: jest.Mocked<S3Client>;
  const originalEnv = process.env;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [R2Service],
    }).compile();

    service = module.get<R2Service>(R2Service);

    // Set environment variables for testing
    process.env = { ...originalEnv };
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.R2_PUBLIC_URL = 'http://test-public-url';

    service.onModuleInit();
    s3Client = (service as any).client;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should call S3Client.send with PutObjectCommand', async () => {
      const key = 'test-key';
      const body = Buffer.from('test');
      const contentType = 'image/png';
      s3Client.send.mockResolvedValue({} as any);

      const result = await service.uploadFile(key, body, contentType);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result).toBe('http://test-public-url/test-key');
    });
  });

  describe('deleteFile', () => {
    it('should call S3Client.send with DeleteObjectCommand', async () => {
      const key = 'test-key';
      s3Client.send.mockResolvedValue({} as any);

      await service.deleteFile(key);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });
  });

  describe('deleteFiles', () => {
    it('should do nothing if keys are empty', async () => {
      s3Client.send.mockResolvedValue({} as any);
      s3Client.send.mockClear();
      await service.deleteFiles([]);
      expect(s3Client.send).not.toHaveBeenCalled();
    });

    it('should call S3Client.send with DeleteObjectsCommand', async () => {
      s3Client.send.mockResolvedValue({} as any);
      s3Client.send.mockClear();
      const keys = ['key1', 'key2'];

      await service.deleteFiles(keys);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectsCommand));
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should call getSignedUrl with PutObjectCommand', async () => {
      const key = 'test-key';
      const contentType = 'image/png';
      (getSignedUrl as jest.Mock).mockResolvedValue('http://signed-url');

      const result = await service.getPresignedUploadUrl(key, contentType);

      expect(getSignedUrl).toHaveBeenCalledWith(s3Client, expect.any(PutObjectCommand), {
        expiresIn: 600,
      });
      expect(result).toBe('http://signed-url');
    });
  });

  describe('getPublicUrl', () => {
    it('should construct public URL', () => {
      expect(service.getPublicUrl('some/key')).toBe('http://test-public-url/some/key');
    });
  });

  describe('onModuleInit', () => {
    it('should handle missing environment variables gracefully', () => {
      delete process.env.R2_ACCOUNT_ID;
      service.onModuleInit();
      expect(service).toBeDefined();
    });

    it('should ensure publicUrl has protocol', () => {
      process.env.R2_PUBLIC_URL = 'test.com';
      service.onModuleInit();
      expect(service.getPublicUrl('key')).toBe('https://test.com/key');
    });
  });
});
