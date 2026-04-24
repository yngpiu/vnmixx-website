import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/decorators/query-optional-bool.decorator';

const CUSTOMER_SORT_BY = ['fullName', 'email', 'phoneNumber', 'isActive', 'createdAt'] as const;

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1' })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn phải là số nguyên' })
  @Min(1, { message: 'Giới hạn phải lớn hơn hoặc bằng 1' })
  @Max(100, { message: 'Giới hạn không được vượt quá 100' })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'Nguyễn',
    description: 'Tìm kiếm theo tên, email hoặc số điện thoại',
  })
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Không gửi = không lọc; true/false = chỉ hoạt động / chỉ vô hiệu.',
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

  @ApiPropertyOptional({ example: 'createdAt', enum: CUSTOMER_SORT_BY })
  @IsString({ message: 'Trường sắp xếp phải là chuỗi ký tự' })
  @IsIn([...CUSTOMER_SORT_BY], { message: 'Trường sắp xếp không hợp lệ' })
  @IsOptional()
  sortBy?: (typeof CUSTOMER_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'], { message: 'Thứ tự sắp xếp phải là asc hoặc desc' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
