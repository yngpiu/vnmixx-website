import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ description: 'Đường dẫn thư mục, ví dụ: banners/slide', example: 'banners' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  @Matches(/^[a-zA-Z0-9_\-/]+$/, {
    message: 'Đường dẫn thư mục chỉ chứa chữ, số, dấu gạch ngang, gạch dưới và dấu /',
  })
  path: string;
}
