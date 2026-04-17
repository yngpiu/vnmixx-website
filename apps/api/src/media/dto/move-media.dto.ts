import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class MoveMediaDto {
  @ApiProperty({ description: 'Thư mục đích', example: 'banners/slide' })
  @IsString({ message: 'Thư mục đích phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Thư mục đích không được vượt quá 500 ký tự' })
  targetFolder: string;
}
