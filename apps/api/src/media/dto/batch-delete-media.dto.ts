import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class BatchDeleteMediaDto {
  @ApiProperty({ description: 'Danh sách ID cần xóa', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  ids: number[];
}
