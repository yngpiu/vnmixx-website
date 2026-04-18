import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogStatus, type MediaFile as MediaFileRow } from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { R2Service } from '../../r2/r2.service';
import type {
  BatchDeleteMediaDto,
  CreateFolderDto,
  ListMediaQueryDto,
  MoveMediaDto,
  UploadMediaDto,
} from '../dto';
import { MediaRepository } from '../repositories/media.repository';

/** Normalize folder path — strip leading/trailing slashes. */
function normalizeFolder(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
}

/** Generate a unique R2 key for an upload. */
function generateObjectKey(folder: string, fileName: string): string {
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const prefix = folder ? `${folder}/` : '';
  return `${prefix}${timestamp}-${rand}-${safe}`;
}

function isAllowedMediaMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType.startsWith('video/');
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function isAllowedMediaFileSize(file: UploadedFileInput): boolean {
  if (file.mimetype.startsWith('image/')) {
    return file.size <= MAX_IMAGE_SIZE;
  }
  if (file.mimetype.startsWith('video/')) {
    return file.size <= MAX_VIDEO_SIZE;
  }
  return false;
}

export type UploadedFileInput = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly repo: MediaRepository,
    private readonly r2: R2Service,
    private readonly auditLogService: AuditLogService,
  ) {}

  /** Append public URL from env `R2_PUBLIC_URL` + stored object `key` (not persisted in DB). */
  private withPublicUrl<T extends MediaFileRow>(row: T): T & { url: string } {
    return { ...row, url: this.r2.getPublicUrl(row.key) };
  }

  async listMedia(query: ListMediaQueryDto) {
    const folder = query.folder !== undefined ? normalizeFolder(query.folder) : undefined;
    const result = await this.repo.findMany({
      folder,
      search: query.search,
      mimeType: query.mimeType,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      page: query.page,
      pageSize: query.pageSize,
    });
    return {
      ...result,
      items: result.items.map((item) => this.withPublicUrl(item)),
    };
  }

  async uploadFile(
    file: UploadedFileInput,
    dto: UploadMediaDto,
    employeeId: number | undefined,
    auditContext: AuditRequestContext = {},
  ) {
    try {
      if (!isAllowedMediaMimeType(file.mimetype)) {
        throw new BadRequestException('Chỉ hỗ trợ upload ảnh hoặc video.');
      }
      if (!isAllowedMediaFileSize(file)) {
        if (file.mimetype.startsWith('image/')) {
          throw new BadRequestException('Ảnh vượt quá giới hạn 10MB.');
        }
        throw new BadRequestException('Video vượt quá giới hạn 50MB.');
      }
      const folder = normalizeFolder(dto.folder);
      const folderId = await this.repo.ensureFolderHierarchy(folder);
      const key = generateObjectKey(folder, file.originalname);
      await this.r2.uploadFile(key, file.buffer, file.mimetype);
      const row = await this.repo.create({
        key,
        fileName: file.originalname,
        folder,
        folderId,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: employeeId,
      });
      const result = this.withPublicUrl(row);
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.upload',
        resourceType: 'media',
        resourceId: String(row.id),
        status: AuditLogStatus.SUCCESS,
        afterData: { id: row.id, key: row.key, folder: row.folder, fileName: row.fileName },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.upload',
        resourceType: 'media',
        status: AuditLogStatus.FAILED,
        afterData: {
          fileName: file.originalname,
          folder: normalizeFolder(dto.folder),
          mimeType: file.mimetype,
        },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async uploadFiles(
    files: UploadedFileInput[],
    dto: UploadMediaDto,
    employeeId: number | undefined,
    auditContext: AuditRequestContext = {},
  ) {
    const results = await Promise.all(
      files.map((file) => this.uploadFile(file, dto, employeeId, auditContext)),
    );
    return results;
  }

  async deleteMedia(id: number, auditContext: AuditRequestContext = {}): Promise<void> {
    const media = await this.repo.findById(id);
    if (!media) {
      throw new NotFoundException('Không tìm thấy file media.');
    }
    try {
      await this.r2.deleteFile(media.key);
      await this.repo.deleteById(id);
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.delete',
        resourceType: 'media',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData: { id: media.id, key: media.key, folder: media.folder },
      });
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.delete',
        resourceType: 'media',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData: { id: media.id, key: media.key },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async batchDeleteMedia(
    dto: BatchDeleteMediaDto,
    auditContext: AuditRequestContext = {},
  ): Promise<{ deletedCount: number }> {
    const files = await this.repo.findByIds(dto.ids);
    if (files.length === 0) return { deletedCount: 0 };
    try {
      const keys = files.map((f) => f.key);
      await this.r2.deleteFiles(keys);
      await this.repo.deleteByIds(files.map((f) => f.id));
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.batch-delete',
        resourceType: 'media',
        resourceId: dto.ids.length === 1 ? String(dto.ids[0]) : `batch:${dto.ids.length}`,
        status: AuditLogStatus.SUCCESS,
        beforeData: { ids: dto.ids },
        afterData: { deletedCount: files.length },
      });
      return { deletedCount: files.length };
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.batch-delete',
        resourceType: 'media',
        resourceId: dto.ids.length === 1 ? String(dto.ids[0]) : `batch:${dto.ids.length}`,
        status: AuditLogStatus.FAILED,
        beforeData: { ids: dto.ids },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async listFolders(): Promise<string[]> {
    return this.repo.findAllFolders();
  }

  async createFolder(
    dto: CreateFolderDto,
    auditContext: AuditRequestContext = {},
  ): Promise<{ path: string }> {
    try {
      const folder = normalizeFolder(dto.path);
      await this.repo.createFolder(folder);
      const result = { path: folder };
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.create-folder',
        resourceType: 'media',
        resourceId: folder || 'root',
        status: AuditLogStatus.SUCCESS,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.create-folder',
        resourceType: 'media',
        status: AuditLogStatus.FAILED,
        afterData: { path: dto.path },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async moveMedia(id: number, dto: MoveMediaDto, auditContext: AuditRequestContext = {}) {
    const media = await this.repo.findById(id);
    if (!media) {
      throw new NotFoundException('Không tìm thấy file media.');
    }
    const beforeData = { id: media.id, folder: media.folder, key: media.key };
    try {
      const targetFolder = normalizeFolder(dto.targetFolder);
      const targetFolderId = await this.repo.ensureFolderHierarchy(targetFolder);
      // DB-only move: logical `folder` changes; R2 object key unchanged (no copy/delete).
      const updated = await this.repo.updateFolder(id, targetFolder, media.key, targetFolderId);
      const result = this.withPublicUrl(updated);
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.move',
        resourceType: 'media',
        resourceId: String(id),
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: { id: updated.id, folder: updated.folder, key: updated.key },
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.move',
        resourceType: 'media',
        resourceId: String(id),
        status: AuditLogStatus.FAILED,
        beforeData,
        afterData: { targetFolder: dto.targetFolder },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /** Delete a folder and all its contents (files in R2 + DB records). */
  async deleteFolder(
    folderPath: string,
    auditContext: AuditRequestContext = {},
  ): Promise<{ deletedFiles: number; deletedFolders: number }> {
    const folder = normalizeFolder(folderPath);
    if (!folder) {
      throw new NotFoundException('Không thể xóa thư mục gốc.');
    }
    try {
      // Find all files in folder + subfolders
      const files = await this.repo.findByFolderPrefix(folder);
      // Delete from R2
      if (files.length > 0) {
        const keys = files.map((f) => f.key);
        await this.r2.deleteFiles(keys);
      }
      // Delete file records from DB
      const deletedFiles = await this.repo.deleteByFolderPrefix(folder);
      // Delete folder records from DB
      const deletedFolders = await this.repo.deleteFolders(folder);
      const result = { deletedFiles, deletedFolders };
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.delete-folder',
        resourceType: 'media',
        resourceId: folder,
        status: AuditLogStatus.SUCCESS,
        beforeData: { path: folder, fileCount: files.length },
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'media.delete-folder',
        resourceType: 'media',
        resourceId: folder,
        status: AuditLogStatus.FAILED,
        beforeData: { path: folder },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
