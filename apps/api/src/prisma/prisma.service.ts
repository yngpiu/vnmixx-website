import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'generated/prisma/client';

/**
 * Service quản lý vòng đời kết nối tới cơ sở dữ liệu (Prisma Client).
 * Kế thừa PrismaClient để thực hiện các truy vấn dữ liệu.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Sử dụng adapter MariaDB với URL từ biến môi trường
    const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
    super({ adapter });
  }

  /**
   * Tự động kết nối DB khi Module được khởi tạo.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to database');
    } catch (error) {
      this.logger.error(
        `Failed to connect to database: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  /**
   * Ngắt kết nối DB khi Module bị hủy (ví dụ khi ứng dụng tắt).
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }
}
