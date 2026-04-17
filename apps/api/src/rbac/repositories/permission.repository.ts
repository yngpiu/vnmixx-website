import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PermissionView {
  id: number;
  name: string;
  description: string | null;
}

// Repository truy vấn các quyền hạn từ cơ sở dữ liệu
@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Lấy danh sách toàn bộ quyền hạn hiện có, sắp xếp theo tên
  async findAll(): Promise<PermissionView[]> {
    return this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
  }

  // Kiểm tra xem tất cả các ID quyền trong danh sách có tồn tại hay không
  async existAll(ids: number[]): Promise<boolean> {
    const count = await this.prisma.permission.count({
      where: { id: { in: ids } },
    });
    return count === ids.length;
  }
}
