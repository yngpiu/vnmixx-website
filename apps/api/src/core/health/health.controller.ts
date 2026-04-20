import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../../auth/decorators';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

/**
 * Controller xử lý các yêu cầu kiểm tra trạng thái sức khỏe (Health Check) của hệ thống.
 * Cung cấp thông tin về trạng thái của DB, Redis và toàn bộ ứng dụng.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  /**
   * Endpoint GET /health kiểm tra đồng thời nhiều chỉ số sức khỏe.
   * Nếu bất kỳ dịch vụ nào (Prisma, Redis) gặp lỗi, endpoint sẽ trả về trạng thái thất bại.
   */
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Application health check (DB + Redis)' })
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy(),
      () => this.redisHealth.isHealthy(),
    ]);
  }
}
