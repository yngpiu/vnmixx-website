import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module quản lý kết nối cơ sở dữ liệu (Prisma).
 * Được đánh dấu @Global để PrismaService có thể sử dụng ở mọi nơi mà không cần import lại module này.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
