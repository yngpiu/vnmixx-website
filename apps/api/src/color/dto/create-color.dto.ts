import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateColorDto {
  @ApiProperty({ example: 'Trắng', maxLength: 50 })
  @IsString({ message: 'Tên màu sắc phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên màu sắc không được để trống' })
  @MaxLength(50, { message: 'Tên màu sắc không được vượt quá 50 ký tự' })
  name: string;

  @ApiProperty({ example: '#FFFFFF', description: 'Mã màu HEX (#RRGGBB)' })
  @IsString({ message: 'Mã màu HEX phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã màu HEX không được để trống' })
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Mã màu HEX không hợp lệ (ví dụ: #FF0000)' })
  hexCode: string;
}
