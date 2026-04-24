import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'generated/prisma/client';

@Injectable()
// Quản lý kết nối Prisma Client và vòng đời truy cập cơ sở dữ liệu.
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Khởi tạo Prisma Client với MariaDB adapter từ biến môi trường.
  constructor() {
    const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
    super({ adapter });
  }

  // Kết nối database khi module được nạp.
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Kết nối thành công tới cơ sở dữ liệu');
    } catch (error) {
      this.logger.error(
        `Không thể kết nối tới cơ sở dữ liệu: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  // Đóng kết nối database khi ứng dụng dừng.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Đã ngắt kết nối cơ sở dữ liệu');
  }
}
