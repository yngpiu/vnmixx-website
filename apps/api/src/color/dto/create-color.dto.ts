import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateColorDto {
  @ApiProperty({ example: 'Trắng', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '#FFFFFF', description: 'Mã màu HEX (#RRGGBB)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'mã màu HEX không hợp lệ (ví dụ: #FF0000)' })
  hexCode: string;
}
