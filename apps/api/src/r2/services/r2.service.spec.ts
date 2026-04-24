import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { R2Service } from './r2.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('R2Service', () => {
  let service: R2Service;
  let s3Client: jest.Mocked<S3Client>;
  let sendMock: jest.Mock;
  let getSignedUrlMock: jest.MockedFunction<typeof getSignedUrl>;
  const mockConfig = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        R2_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-key',
        R2_SECRET_ACCESS_KEY: 'test-secret',
        R2_BUCKET_NAME: 'test-bucket',
        R2_PUBLIC_URL: 'http://test-public-url',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    mockConfig.getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        R2_ACCOUNT_ID: 'test-account',
        R2_ACCESS_KEY_ID: 'test-key',
        R2_SECRET_ACCESS_KEY: 'test-secret',
        R2_BUCKET_NAME: 'test-bucket',
        R2_PUBLIC_URL: 'http://test-public-url',
      };
      return values[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [R2Service, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<R2Service>(R2Service);

    service.onModuleInit();
    s3Client = (service as any).client as jest.Mocked<S3Client>;
    sendMock = s3Client.send as unknown as jest.Mock;
    getSignedUrlMock = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should call S3Client.send with PutObjectCommand', async () => {
      const key = 'test-key';
      const body = Buffer.from('test');
      const contentType = 'image/png';
      sendMock.mockImplementation(() => Promise.resolve({}));

      const result = await service.uploadFile(key, body, contentType);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result).toBe('http://test-public-url/test-key');
    });

    it('should throw BadGatewayException when upload fails', async () => {
      sendMock.mockImplementation(() => Promise.reject(new Error('network error')));

      await expect(
        service.uploadFile('test-key', Buffer.from('test'), 'image/png'),
      ).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('deleteFile', () => {
    it('should call S3Client.send with DeleteObjectCommand', async () => {
      const key = 'test-key';
      sendMock.mockImplementation(() => Promise.resolve({}));

      await service.deleteFile(key);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('should throw BadGatewayException when delete fails', async () => {
      sendMock.mockImplementation(() => Promise.reject(new Error('delete error')));

      await expect(service.deleteFile('test-key')).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('deleteFiles', () => {
    it('should do nothing if keys are empty', async () => {
      sendMock.mockImplementation(() => Promise.resolve({}));
      sendMock.mockClear();
      await service.deleteFiles([]);
      expect(sendMock).not.toHaveBeenCalled();
    });

    it('should call S3Client.send with DeleteObjectsCommand', async () => {
      sendMock.mockImplementation(() => Promise.resolve({}));
      sendMock.mockClear();
      const keys = ['key1', 'key2'];

      await service.deleteFiles(keys);

      expect(s3Client.send).toHaveBeenCalledWith(expect.any(DeleteObjectsCommand));
    });

    it('should throw BadGatewayException when delete many fails', async () => {
      sendMock.mockImplementation(() => Promise.reject(new Error('delete many error')));

      await expect(service.deleteFiles(['k1', 'k2'])).rejects.toBeInstanceOf(BadGatewayException);
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should call getSignedUrl with PutObjectCommand', async () => {
      const key = 'test-key';
      const contentType = 'image/png';
      getSignedUrlMock.mockResolvedValue('http://signed-url');

      const result = await service.getPresignedUploadUrl(key, contentType);

      expect(getSignedUrl).toHaveBeenCalledWith(s3Client, expect.any(PutObjectCommand), {
        expiresIn: 600,
      });
      expect(result).toBe('http://signed-url');
    });

    it('should throw BadGatewayException when signing fails', async () => {
      getSignedUrlMock.mockRejectedValue(new Error('sign error'));

      await expect(service.getPresignedUploadUrl('test-key', 'image/png')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });

  describe('getPublicUrl', () => {
    it('should construct public URL', () => {
      expect(service.getPublicUrl('some/key')).toBe('http://test-public-url/some/key');
    });
  });

  describe('onModuleInit', () => {
    it('should throw if required env is missing', async () => {
      const failingConfig = {
        getOrThrow: jest.fn((key: string) => {
          if (key === 'R2_ACCOUNT_ID') {
            throw new Error('Missing R2_ACCOUNT_ID');
          }
          const values: Record<string, string> = {
            R2_ACCESS_KEY_ID: 'test-key',
            R2_SECRET_ACCESS_KEY: 'test-secret',
            R2_BUCKET_NAME: 'test-bucket',
            R2_PUBLIC_URL: 'http://test-public-url',
          };
          return values[key];
        }),
      };

      await expect(
        Test.createTestingModule({
          providers: [R2Service, { provide: ConfigService, useValue: failingConfig }],
        }).compile(),
      ).rejects.toThrow('Missing R2_ACCOUNT_ID');
    });

    it('should ensure publicUrl has protocol', () => {
      mockConfig.getOrThrow.mockImplementation((key: string) => {
        const values: Record<string, string> = {
          R2_ACCOUNT_ID: 'test-account',
          R2_ACCESS_KEY_ID: 'test-key',
          R2_SECRET_ACCESS_KEY: 'test-secret',
          R2_BUCKET_NAME: 'test-bucket',
          R2_PUBLIC_URL: 'test.com',
        };
        return values[key];
      });
      const testService = new R2Service(mockConfig as unknown as ConfigService);
      testService.onModuleInit();
      expect(testService.getPublicUrl('key')).toBe('https://test.com/key');
    });
  });
});
