import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: true, description: 'Kích hoạt hoặc vô hiệu hóa nhân viên' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
