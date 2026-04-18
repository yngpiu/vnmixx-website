import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../auth/decorators';
import { AnalyticsService } from './analytics.service';
import { CollectPageVisitDto } from './dto/collect-page-visit.dto';

@ApiTags('Shop analytics')
@Controller('shop')
export class ShopPageVisitController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('page-visits')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Ghi nhận lượt xem trang storefront',
    description: 'Không cần JWT. User-Agent lấy từ header hoặc body không dùng.',
  })
  async collectPageVisit(@Body() body: CollectPageVisitDto, @Req() req: Request): Promise<void> {
    const ua = req.headers['user-agent'];
    await this.analyticsService.recordPageVisit({
      path: body.path,
      referrer: body.referrer,
      sessionKey: body.sessionKey,
      userAgentHeader: typeof ua === 'string' ? ua : undefined,
      ipAddress: this.analyticsService.extractClientIp(req),
    });
  }
}
