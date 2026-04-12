import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/transforms/query-optional-boolean.transform';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Không gửi = không lọc; true/false = chỉ đang bật / chỉ tắt.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Không gửi = không lọc; true = chỉ đã xóa mềm; false = chỉ chưa xóa.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  isSoftDeleted?: boolean;
}
