import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/decorators/query-optional-bool.decorator';

/**
 * ListCategoriesQueryDto: DTO xử lý các tham số lọc khi liệt kê danh mục (Admin).
 */
export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Không gửi = không lọc; true/false = chỉ đang bật / chỉ tắt.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Không gửi = không lọc; true = chỉ đã xóa mềm; false = chỉ chưa xóa.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean({ message: 'Trạng thái xóa phải là kiểu boolean' })
  @IsOptional()
  isSoftDeleted?: boolean;
}
