import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class MoveMediaDto {
  @ApiProperty({ description: 'Thư mục đích', example: 'banners/slide' })
  @IsString()
  @MaxLength(500)
  targetFolder: string;
}
