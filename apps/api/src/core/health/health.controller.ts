import { Controller, Get } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../../auth/decorators';
import { PrismaHealthIndicator } from './prisma-health.indicator';
import { RedisHealthIndicator } from './redis-health.indicator';

// Kiểm tra trạng thái sức khỏe (Health Check) của hệ thống.
// Đảm bảo DB, Redis và toàn bộ ứng dụng đang hoạt động ổn định.
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  // Kiểm tra đồng thời tính khả dụng của cơ sở dữ liệu và cache.
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Application health check (DB + Redis)' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy(),
      () => this.redisHealth.isHealthy(),
    ]);
  }
}
