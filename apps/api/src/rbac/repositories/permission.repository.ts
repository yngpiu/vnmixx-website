import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/services/prisma.service';

export interface PermissionView {
  id: number;
  name: string;
  description: string | null;
}

const PERMISSION_SELECT = {
  id: true,
  name: true,
  description: true,
} as const;

@Injectable()
// Repository truy xuất dữ liệu quyền từ bảng permission.
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy toàn bộ quyền và sắp xếp theo tên tăng dần.
  async findAll(): Promise<PermissionView[]> {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
      select: PERMISSION_SELECT,
    });
  }

  // Kiểm tra danh sách id quyền có tồn tại đầy đủ hay không.
  async existAll(ids: number[]): Promise<boolean> {
    const count = await this.prisma.permission.count({
      where: { id: { in: ids } },
    });
    return count === ids.length;
  }
}
