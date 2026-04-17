import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class BatchDeleteMediaDto {
  @ApiProperty({ description: 'Danh sách ID cần xóa', type: [Number] })
  @IsArray({ message: 'Danh sách ID phải là một mảng' })
  @ArrayMinSize(1, { message: 'Phải cung cấp ít nhất một ID để xóa' })
  @ArrayMaxSize(100, { message: 'Không thể xóa quá 100 tệp cùng lúc' })
  @IsInt({ each: true, message: 'Mỗi ID phải là số nguyên' })
  ids: number[];
}
