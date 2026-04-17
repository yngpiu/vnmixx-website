import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor', description: 'Tên vai trò duy nhất', maxLength: 50 })
  @IsString({ message: 'Tên vai trò phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  @MaxLength(50, { message: 'Tên vai trò không được vượt quá 50 ký tự' })
  name: string;

  @ApiPropertyOptional({ example: 'Can edit content', maxLength: 255 })
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  @IsOptional()
  @MaxLength(255, { message: 'Mô tả không được vượt quá 255 ký tự' })
  description?: string;

  @ApiPropertyOptional({
    example: [1, 2, 5],
    description: 'Danh sách ID quyền cần gán ngay',
    type: [Number],
  })
  @IsArray({ message: 'Danh sách ID quyền phải là một mảng' })
  @ArrayUnique({ message: 'Các ID quyền không được trùng lặp' })
  @IsInt({ each: true, message: 'Mỗi ID quyền phải là một số nguyên' })
  @IsOptional()
  permissionIds?: number[];
}
