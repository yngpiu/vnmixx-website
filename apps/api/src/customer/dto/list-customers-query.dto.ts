import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/transforms/query-optional-boolean.transform';

const CUSTOMER_SORT_BY = ['fullName', 'email', 'phoneNumber', 'isActive', 'createdAt'] as const;

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

  @ApiPropertyOptional({
    example: true,
    description: 'Không gửi = không lọc; true/false = chỉ hoạt động / chỉ vô hiệu.',
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

  @ApiPropertyOptional({ example: 'createdAt', enum: CUSTOMER_SORT_BY })
  @IsString()
  @IsIn([...CUSTOMER_SORT_BY])
  @IsOptional()
  sortBy?: (typeof CUSTOMER_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
