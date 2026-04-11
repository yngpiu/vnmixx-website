import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/transforms/query-optional-boolean.transform';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Bao gồm danh mục đã xóa mềm trong kết quả',
    default: false,
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}
