import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type MediaFileFindManyArgs = {
  folder?: string;
  search?: string;
  mimeType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type MediaFileCreateInput = {
  key: string;
  fileName: string;
  folder: string;
  folderId?: number;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  uploadedBy?: number;
};

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(args: MediaFileFindManyArgs) {
    const page = args.page ?? 1;
    const pageSize = args.pageSize ?? 24;
    const skip = (page - 1) * pageSize;
    const where: Prisma.MediaFileWhereInput = {};
    if (args.folder !== undefined) {
      where.folder = args.folder;
    }
    if (args.search) {
      where.fileName = { contains: args.search };
    }
    if (args.mimeType) {
      where.mimeType = { startsWith: args.mimeType };
    }
    const orderBy: Prisma.MediaFileOrderByWithRelationInput = {};
    const sortField = args.sortBy ?? 'createdAt';
    const sortOrder = args.sortOrder ?? 'desc';
    if (sortField === 'fileName') {
      orderBy.fileName = sortOrder;
    } else if (sortField === 'size') {
      orderBy.size = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaFile.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      this.prisma.mediaFile.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findById(id: number) {
    return this.prisma.mediaFile.findUnique({ where: { id } });
  }

  async create(data: MediaFileCreateInput) {
    return this.prisma.mediaFile.create({ data });
  }

  async updateFolder(id: number, folder: string, key: string, folderId?: number) {
    return this.prisma.mediaFile.update({
      where: { id },
      data: { folder, key, folderId },
    });
  }

  async deleteById(id: number) {
    return this.prisma.mediaFile.delete({ where: { id } });
  }

  /** Get all folders: merged from file paths + explicitly created folders. */
  async findAllFolders(): Promise<string[]> {
    const [fileRows, folderRows] = await Promise.all([
      this.prisma.mediaFile.findMany({
        select: { folder: true },
        distinct: ['folder'],
        orderBy: { folder: 'asc' },
      }),
      this.prisma.mediaFolder.findMany({
        select: { path: true },
        orderBy: { path: 'asc' },
      }),
    ]);
    const folderSet = new Set<string>();
    // Expand file-derived folder paths (e.g. "a/b/c" → "a", "a/b", "a/b/c")
    for (const row of fileRows) {
      if (!row.folder) continue;
      const parts = row.folder.split('/');
      let path = '';
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        folderSet.add(path);
      }
    }
    // Add explicitly created folders
    for (const row of folderRows) {
      if (!row.path) continue;
      const parts = row.path.split('/');
      let path = '';
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        folderSet.add(path);
      }
    }
    return Array.from(folderSet).sort();
  }

  /** Upsert an explicitly created folder (ignore duplicate). */
  async createFolder(path: string): Promise<void> {
    await this.ensureFolderHierarchy(path);
  }

  async getFolderIdByPath(path: string): Promise<number | undefined> {
    if (!path) return undefined;
    const folder = await this.prisma.mediaFolder.findUnique({
      where: { path },
      select: { id: true },
    });
    return folder?.id;
  }

  async ensureFolderHierarchy(path: string): Promise<number | undefined> {
    if (!path) return undefined;

    const parts = path.split('/').filter(Boolean);
    let currentPath = '';
    let parentId: number | undefined;

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const row = await this.prisma.mediaFolder.upsert({
        where: { path: currentPath },
        create: {
          path: currentPath,
          name: part,
          parentId,
        },
        update: {
          name: part,
          parentId,
        },
        select: { id: true },
      });
      parentId = row.id;
    }

    return parentId;
  }

  async backfillFolderLinks(): Promise<number> {
    const files = await this.prisma.mediaFile.findMany({
      where: {
        folder: { not: '' },
        folderId: null,
      },
      select: { id: true, folder: true },
    });

    for (const file of files) {
      const folderId = await this.ensureFolderHierarchy(file.folder);
      await this.prisma.mediaFile.update({
        where: { id: file.id },
        data: { folderId },
      });
    }

    return files.length;
  }

  /** Find all media files whose folder matches a prefix (folder itself + subfolders). */
  async findByFolderPrefix(folderPath: string) {
    return this.prisma.mediaFile.findMany({
      where: {
        OR: [{ folder: folderPath }, { folder: { startsWith: `${folderPath}/` } }],
      },
    });
  }

  /** Delete a folder and all sub-folders from the MediaFolder table. */
  async deleteFolders(folderPath: string): Promise<number> {
    const result = await this.prisma.mediaFolder.deleteMany({
      where: {
        OR: [{ path: folderPath }, { path: { startsWith: `${folderPath}/` } }],
      },
    });
    return result.count;
  }

  /** Delete all media files whose folder matches a prefix. */
  async deleteByFolderPrefix(folderPath: string): Promise<number> {
    const result = await this.prisma.mediaFile.deleteMany({
      where: {
        OR: [{ folder: folderPath }, { folder: { startsWith: `${folderPath}/` } }],
      },
    });
    return result.count;
  }
}
