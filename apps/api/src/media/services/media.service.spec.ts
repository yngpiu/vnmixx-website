import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogStatus } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { R2Service } from '../../r2/services/r2.service';
import { MediaRepository } from '../repositories/media.repository';
import { MediaService, type UploadedFileInput } from './media.service';

describe('MediaService', () => {
  let service: MediaService;
  let repo: MediaRepository;
  let r2: R2Service;
  let auditLogService: AuditLogService;

  const mockMediaRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    deleteById: jest.fn(),
    ensureFolderHierarchy: jest.fn(),
    findAllFolders: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    findByFolderPrefix: jest.fn(),
    deleteByFolderPrefix: jest.fn(),
    deleteFolders: jest.fn(),
  };

  const mockR2Service = {
    getPublicUrl: jest.fn().mockImplementation((key) => `http://public/${key}`),
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    deleteFiles: jest.fn(),
  };

  const mockAuditLogService = {
    write: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: MediaRepository, useValue: mockMediaRepository },
        { provide: R2Service, useValue: mockR2Service },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    repo = module.get<MediaRepository>(MediaRepository);
    r2 = module.get<R2Service>(R2Service);
    auditLogService = module.get<AuditLogService>(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listMedia', () => {
    it('should return paginated media with public URLs', async () => {
      const mockResult = {
        data: [{ id: 1, key: 'file1.jpg', fileName: 'file1.jpg' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      mockMediaRepository.findMany.mockResolvedValue(mockResult);

      const result = await service.listMedia({ page: 1, pageSize: 10, folder: '/test/' });

      expect(repo.findMany).toHaveBeenCalledWith(expect.objectContaining({ folder: 'test' }));
      expect(result.data[0].url).toBe('http://public/file1.jpg');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('uploadFile', () => {
    const mockFile: UploadedFileInput = {
      originalname: 'test.png',
      mimetype: 'image/png',
      buffer: Buffer.from('test'),
      size: 100,
    };

    it('should throw BadRequestException for unsupported mime types', async () => {
      const badFile = { ...mockFile, mimetype: 'text/plain' };
      await expect(service.uploadFile(badFile, { folder: '' }, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if image size exceeds limit', async () => {
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };
      await expect(service.uploadFile(largeFile, { folder: '' }, 1)).rejects.toThrow(
        'Ảnh vượt quá giới hạn 10MB.',
      );
    });

    it('should throw BadRequestException if video size exceeds limit', async () => {
      const largeVideo = { ...mockFile, mimetype: 'video/mp4', size: 51 * 1024 * 1024 };
      await expect(service.uploadFile(largeVideo, { folder: '' }, 1)).rejects.toThrow(
        'Video vượt quá giới hạn 50MB.',
      );
    });

    it('should upload file, create DB record and write audit log', async () => {
      mockMediaRepository.ensureFolderHierarchy.mockResolvedValue(1);
      mockMediaRepository.create.mockResolvedValue({
        id: 10,
        key: 'k',
        fileName: 'f',
        folder: 'fld',
      });

      const result = await service.uploadFile(mockFile, { folder: 'my/folder/' }, 1);

      expect(repo.ensureFolderHierarchy).toHaveBeenCalledWith('my/folder');
      expect(r2.uploadFile).toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalled();
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'media.upload',
          status: AuditLogStatus.SUCCESS,
        }),
      );
      expect(result.url).toBe('http://public/k');
    });

    it('should log failure and rethrow error if upload fails', async () => {
      mockMediaRepository.ensureFolderHierarchy.mockRejectedValue(new Error('DB Error'));
      await expect(service.uploadFile(mockFile, { folder: '' }, 1)).rejects.toThrow('DB Error');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
        }),
      );
    });
  });

  describe('deleteMedia', () => {
    it('should throw NotFoundException if media not found', async () => {
      mockMediaRepository.findById.mockResolvedValue(null);
      await expect(service.deleteMedia(1)).rejects.toThrow(NotFoundException);
    });

    it('should delete from R2 and DB and log audit', async () => {
      const mockMedia = { id: 1, key: 'key1' };
      mockMediaRepository.findById.mockResolvedValue(mockMedia);

      await service.deleteMedia(1);

      expect(r2.deleteFile).toHaveBeenCalledWith('key1');
      expect(repo.deleteById).toHaveBeenCalledWith(1);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'media.delete',
          status: AuditLogStatus.SUCCESS,
        }),
      );
    });
  });

  describe('createFolder', () => {
    it('should create folder and log audit', async () => {
      const result = await service.createFolder({ path: '/new/folder/' });
      expect(repo.createFolder).toHaveBeenCalledWith('new/folder');
      expect(result.path).toBe('new/folder');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'media.create-folder',
          status: AuditLogStatus.SUCCESS,
        }),
      );
    });
  });

  describe('moveMedia', () => {
    it('should move media to target folder', async () => {
      const mockMedia = { id: 1, key: 'k', folder: 'old' };
      mockMediaRepository.findById.mockResolvedValue(mockMedia);
      mockMediaRepository.ensureFolderHierarchy.mockResolvedValue(2);
      mockMediaRepository.updateFolder.mockResolvedValue({ ...mockMedia, folder: 'new' });

      await service.moveMedia(1, { targetFolder: 'new' });

      expect(repo.updateFolder).toHaveBeenCalledWith(1, 'new', 'k', 2);
    });
  });

  describe('deleteFolder', () => {
    it('should throw NotFoundException for root folder', async () => {
      await expect(service.deleteFolder('')).rejects.toThrow(NotFoundException);
    });

    it('should delete all files in folder from R2 and DB', async () => {
      const mockFiles = [{ key: 'f1' }, { key: 'f2' }];
      mockMediaRepository.findByFolderPrefix.mockResolvedValue(mockFiles);
      mockMediaRepository.deleteByFolderPrefix.mockResolvedValue(2);
      mockMediaRepository.deleteFolders.mockResolvedValue(1);

      const result = await service.deleteFolder('my-folder');

      expect(r2.deleteFiles).toHaveBeenCalledWith(['f1', 'f2']);
      expect(repo.deleteByFolderPrefix).toHaveBeenCalledWith('my-folder');
      expect(repo.deleteFolders).toHaveBeenCalledWith('my-folder');
      expect(result).toEqual({ deletedFiles: 2, deletedFolders: 1 });
    });
  });
});
