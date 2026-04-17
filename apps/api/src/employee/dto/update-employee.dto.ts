import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';

const EMPLOYEE_STATUS = ['ACTIVE', 'INACTIVE'] as const;

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    enum: EMPLOYEE_STATUS,
    description: 'Trạng thái tài khoản nhân viên',
  })
  @IsOptional()
  @IsIn([...EMPLOYEE_STATUS])
  status?: (typeof EMPLOYEE_STATUS)[number];

  @ApiPropertyOptional({
    example: [1],
    description: 'Thay thế toàn bộ vai trò; gửi mảng rỗng để gỡ hết',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds?: number[];
}
