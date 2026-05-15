import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShopContentKey } from '../../../generated/prisma/client';
import { RequirePermissions, RequireUserType } from '../../auth/decorators';
import { RedisService } from '../../redis/services/redis.service';
import { UpsertShopContentDto } from '../dto/upsert-shop-content.dto';
import { ShopContentRepository } from '../repositories/shop-content.repository';
import { SHOP_CONTENT_CACHE_KEYS } from '../shop-content.cache';

@ApiTags('Shop Content (Admin)')
@ApiBearerAuth('access-token')
@RequireUserType('EMPLOYEE')
@Controller('admin/shop-contents')
export class AdminShopContentController {
  constructor(
    private readonly shopContentRepository: ShopContentRepository,
    private readonly redisService: RedisService,
  ) {}

  @ApiOperation({ summary: 'Lấy tất cả Shop Content' })
  @Get()
  @RequirePermissions('knowledge.read')
  async findAll() {
    return this.shopContentRepository.findAll();
  }

  @ApiOperation({ summary: 'Lấy chi tiết một Shop Content' })
  @Get(':key')
  @RequirePermissions('knowledge.read')
  async findOne(@Param('key') key: ShopContentKey) {
    const item = await this.shopContentRepository.findByKey(key);
    return item ? { ...item, key } : null;
  }

  @ApiOperation({ summary: 'Cập nhật/Thêm mới Shop Content' })
  @Put(':key')
  @RequirePermissions('knowledge.update')
  async upsert(@Param('key') key: ShopContentKey, @Body() dto: UpsertShopContentDto) {
    await this.shopContentRepository.upsert(key, dto.title, dto.content);

    // Xóa cache để AI chatbot có thể cập nhật nội dung mới
    await this.redisService.del(SHOP_CONTENT_CACHE_KEYS.DETAIL(key));

    return this.shopContentRepository.findByKey(key);
  }
}
