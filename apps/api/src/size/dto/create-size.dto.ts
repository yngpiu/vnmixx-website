import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/**
 * CreateSizeDto: DTO tạo mới kích thước.
 * Vai trò: Validate dữ liệu đầu vào khi thêm một kích thước mới (ví dụ: S, M, L).
 */
export class CreateSizeDto {
  @ApiProperty({ example: 'M', maxLength: 10 })
  @IsString({ message: 'Nhãn kích thước phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Nhãn kích thước không được để trống' })
  @MaxLength(10, { message: 'Nhãn kích thước không được vượt quá 10 ký tự' })
  label: string;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @IsOptional()
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  sortOrder?: number;
}
