import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Chỉ số kiểm tra sức khỏe của cơ sở dữ liệu qua Prisma.
 */
@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly prisma: PrismaService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Thực hiện truy vấn SELECT 1 đơn giản để xác nhận kết nối tới DB vẫn đang hoạt động.
   */
  async isHealthy(key: string = 'database'): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return this.healthIndicatorService.check(key).up();
    } catch {
      return this.healthIndicatorService.check(key).down();
    }
  }
}
