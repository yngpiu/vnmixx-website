import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const COLOR_SORT_BY = ['name', 'hexCode', 'updatedAt'] as const;

export class ListColorsQueryDto {
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
    example: 'trắng',
    description: 'Tìm theo tên hoặc mã HEX',
  })
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'name', enum: COLOR_SORT_BY })
  @IsString({ message: 'Trường sắp xếp phải là chuỗi ký tự' })
  @IsIn([...COLOR_SORT_BY], { message: 'Trường sắp xếp không hợp lệ' })
  @IsOptional()
  sortBy?: (typeof COLOR_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'], { message: 'Thứ tự sắp xếp phải là asc hoặc desc' })
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
