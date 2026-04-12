import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/transforms/query-optional-boolean.transform';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Khi true, trả về cả danh mục đã xóa và chưa xóa.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  isSoftDeleted?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Chỉ lấy danh mục đã xóa (ưu tiên hơn isSoftDeleted khi cả hai được gửi).',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  onlyDeleted?: boolean;
}
