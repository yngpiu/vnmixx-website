import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TransformQueryOptionalBoolean } from '../../common/decorators/query-optional-bool.decorator';

const BANNER_PLACEMENTS = ['HERO_SLIDER', 'FEATURED_TILE', 'PROMO_STRIP'] as const;

export class ListBannersQueryDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Không gửi = không lọc; true/false = chỉ đang bật / chỉ tắt.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    enum: BANNER_PLACEMENTS,
    description: 'Không gửi = lấy mọi vị trí banner.',
    example: 'HERO_SLIDER',
  })
  @IsEnum(BANNER_PLACEMENTS, { message: 'Loại vị trí banner không hợp lệ' })
  @IsOptional()
  placement?: (typeof BANNER_PLACEMENTS)[number];
}
