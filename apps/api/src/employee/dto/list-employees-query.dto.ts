import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/transforms/query-optional-boolean.transform';

const EMPLOYEE_SORT_BY = ['fullName', 'email', 'phoneNumber', 'status', 'createdAt'] as const;
const EMPLOYEE_STATUS = ['ACTIVE', 'INACTIVE'] as const;

export class ListEmployeesQueryDto {
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
    example: 'Trần',
    description: 'Tìm kiếm theo tên, email hoặc số điện thoại',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: EMPLOYEE_STATUS,
    description: 'Không gửi = không lọc; gửi một trạng thái để lọc.',
  })
  @IsIn([...EMPLOYEE_STATUS])
  @IsOptional()
  status?: (typeof EMPLOYEE_STATUS)[number];

  @ApiPropertyOptional({
    example: false,
    description: 'Không gửi = không lọc; true = chỉ đã xóa mềm; false = chỉ chưa xóa.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  isSoftDeleted?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Chỉ nhân viên đang có vai trò này' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  roleId?: number;

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: EMPLOYEE_SORT_BY,
    description: 'Trường sắp xếp (mặc định createdAt giảm dần khi không gửi).',
  })
  @IsString()
  @IsIn([...EMPLOYEE_SORT_BY])
  @IsOptional()
  sortBy?: (typeof EMPLOYEE_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
