import { Injectable, NotFoundException } from '@nestjs/common';
import type { MediaFile as MediaFileRow } from '../../../generated/prisma/client';
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

  async uploadFile(file: UploadedFileInput, dto: UploadMediaDto, employeeId?: number) {
    const folder = normalizeFolder(dto.folder);
    const key = generateObjectKey(folder, file.originalname);
    await this.r2.uploadFile(key, file.buffer, file.mimetype);
    const row = await this.repo.create({
      key,
      fileName: file.originalname,
      folder,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: employeeId,
    });
    return this.withPublicUrl(row);
  }

  async uploadFiles(files: UploadedFileInput[], dto: UploadMediaDto, employeeId?: number) {
    const results = await Promise.all(files.map((file) => this.uploadFile(file, dto, employeeId)));
    return results;
  }

  async deleteMedia(id: number): Promise<void> {
    const media = await this.repo.findById(id);
    if (!media) {
      throw new NotFoundException('Không tìm thấy file media.');
    }
    await this.r2.deleteFile(media.key);
    await this.repo.deleteById(id);
  }

  async batchDeleteMedia(dto: BatchDeleteMediaDto): Promise<{ deletedCount: number }> {
    const files = await this.repo.findByIds(dto.ids);
    if (files.length === 0) return { deletedCount: 0 };
    const keys = files.map((f) => f.key);
    await this.r2.deleteFiles(keys);
    await this.repo.deleteByIds(files.map((f) => f.id));
    return { deletedCount: files.length };
  }

  async listFolders(): Promise<string[]> {
    return this.repo.findAllFolders();
  }

  async createFolder(dto: CreateFolderDto): Promise<{ path: string }> {
    const folder = normalizeFolder(dto.path);
    await this.repo.createFolder(folder);
    return { path: folder };
  }

  async moveMedia(id: number, dto: MoveMediaDto) {
    const media = await this.repo.findById(id);
    if (!media) {
      throw new NotFoundException('Không tìm thấy file media.');
    }
    const targetFolder = normalizeFolder(dto.targetFolder);
    // DB-only move: logical `folder` changes; R2 object key unchanged (no copy/delete).
    const updated = await this.repo.updateFolder(id, targetFolder, media.key);
    return this.withPublicUrl(updated);
  }

  /** Delete a folder and all its contents (files in R2 + DB records). */
  async deleteFolder(
    folderPath: string,
  ): Promise<{ deletedFiles: number; deletedFolders: number }> {
    const folder = normalizeFolder(folderPath);
    if (!folder) {
      throw new NotFoundException('Không thể xóa thư mục gốc.');
    }
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
    return { deletedFiles, deletedFolders };
  }
}
