import { Global, Module } from '@nestjs/common';
import { PrismaService } from './services/prisma.service';

// Cung cấp PrismaService dùng chung toàn ứng dụng qua phạm vi Global module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
