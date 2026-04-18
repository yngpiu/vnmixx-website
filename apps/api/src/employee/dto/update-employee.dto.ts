import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

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
    example: 1,
    description: 'Thay đổi vai trò của nhân viên (mỗi nhân viên chỉ có 1 vai trò).',
  })
  @IsOptional()
  @IsInt({ message: 'ID vai trò phải là số nguyên' })
  @Min(1, { message: 'ID vai trò phải lớn hơn hoặc bằng 1' })
  roleId?: number;
}
