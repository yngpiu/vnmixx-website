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
// Repository quản lý các thao tác truy vấn và thay đổi dữ liệu media trong Database
// Xử lý các bảng MediaFile và MediaFolder với các logic phân cấp thư mục
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Tìm kiếm và liệt kê media files với các tiêu chí lọc và phân trang
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

  // Cập nhật thông tin thư mục của một file media
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
  // Lấy danh sách tất cả các thư mục duy nhất từ cả tệp tin và các thư mục được tạo rõ ràng
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
    // Phân rã đường dẫn thư mục từ tệp (ví dụ: "a/b/c" thành "a", "a/b", "a/b/c")
    for (const row of fileRows) {
      if (!row.folder) continue;
      const parts = row.folder.split('/');
      let path = '';
      for (const part of parts) {
        path = path ? `${path}/${part}` : part;
        folderSet.add(path);
      }
    }
    // Thêm các thư mục được tạo thủ công
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

  // Đảm bảo cấu trúc cây thư mục tồn tại trong DB, tạo mới nếu thiếu
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
  // Tìm tất cả tệp media thuộc một thư mục hoặc các thư mục con của nó
  async findByFolderPrefix(folderPath: string) {
    return this.prisma.mediaFile.findMany({
      where: {
        OR: [{ folder: folderPath }, { folder: { startsWith: `${folderPath}/` } }],
      },
    });
  }

  /** Delete a folder and all sub-folders from the MediaFolder table. */
  // Xóa thư mục và tất cả thư mục con trong bảng MediaFolder
  async deleteFolders(folderPath: string): Promise<number> {
    const result = await this.prisma.mediaFolder.deleteMany({
      where: {
        OR: [{ path: folderPath }, { path: { startsWith: `${folderPath}/` } }],
      },
    });
    return result.count;
  }

  /** Delete all media files whose folder matches a prefix. */
  // Xóa tất cả tệp media thuộc một tiền tố đường dẫn thư mục
  async deleteByFolderPrefix(folderPath: string): Promise<number> {
    const result = await this.prisma.mediaFile.deleteMany({
      where: {
        OR: [{ folder: folderPath }, { folder: { startsWith: `${folderPath}/` } }],
      },
    });
    return result.count;
  }
}
