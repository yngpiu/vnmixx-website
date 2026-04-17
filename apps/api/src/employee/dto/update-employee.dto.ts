import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';

const EMPLOYEE_STATUS = ['ACTIVE', 'INACTIVE'] as const;

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    enum: EMPLOYEE_STATUS,
    description: 'Trạng thái tài khoản nhân viên',
  })
  @IsOptional()
  @IsIn([...EMPLOYEE_STATUS], { message: 'Trạng thái nhân viên không hợp lệ' })
  status?: (typeof EMPLOYEE_STATUS)[number];

  @ApiPropertyOptional({
    example: [1],
    description: 'Thay thế toàn bộ vai trò; gửi mảng rỗng để gỡ hết',
    type: [Number],
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách vai trò phải là một mảng' })
  @ArrayUnique({ message: 'Các vai trò không được trùng lặp' })
  @IsInt({ each: true, message: 'Mỗi ID vai trò phải là số nguyên' })
  @Min(1, { each: true, message: 'Mỗi ID vai trò phải lớn hơn hoặc bằng 1' })
  roleIds?: number[];
}
