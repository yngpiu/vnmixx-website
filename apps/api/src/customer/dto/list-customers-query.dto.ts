import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/transforms/query-optional-boolean.transform';

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'Nguyễn',
    description: 'Tìm kiếm theo tên, email hoặc số điện thoại',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: true, description: 'Lọc theo trạng thái hoạt động' })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Khi true, trả về cả khách hàng đã xóa mềm và chưa xóa.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  isSoftDeleted?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Chỉ lấy khách hàng đã xóa mềm (ưu tiên hơn isSoftDeleted khi cả hai được gửi).',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  onlyDeleted?: boolean;
}
