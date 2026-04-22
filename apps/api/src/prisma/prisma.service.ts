import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'generated/prisma/client';

// PrismaService: Quản lý vòng đời kết nối tới cơ sở dữ liệu (Prisma Client).
// Kế thừa PrismaClient để thực hiện các truy vấn dữ liệu trực tiếp trong toàn bộ ứng dụng.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // 1. Sử dụng adapter MariaDB với URL từ biến môi trường để tối ưu hóa kết nối đặc thù cho MariaDB
    const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
    super({ adapter });
  }

  // Tự động kết nối cơ sở dữ liệu khi Module được khởi tạo lần đầu
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

  // Ngắt kết nối cơ sở dữ liệu an toàn khi Module bị hủy (ví dụ khi ứng dụng tắt)
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Đã ngắt kết nối cơ sở dữ liệu');
  }
}
