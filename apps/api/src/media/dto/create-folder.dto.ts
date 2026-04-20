import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

// DTO định nghĩa cấu trúc dữ liệu để tạo một thư mục media mới
export class CreateFolderDto {
  @ApiProperty({ description: 'Đường dẫn thư mục, ví dụ: banners/slide', example: 'banners' })
  @IsNotEmpty({ message: 'Đường dẫn thư mục không được để trống' })
  @IsString({ message: 'Đường dẫn thư mục phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Đường dẫn thư mục không được vượt quá 500 ký tự' })
  @Matches(/^[a-zA-Z0-9_\-/]+$/, {
    message: 'Đường dẫn thư mục chỉ chứa chữ, số, dấu gạch ngang, gạch dưới và dấu /',
  })
  path: string;
}
