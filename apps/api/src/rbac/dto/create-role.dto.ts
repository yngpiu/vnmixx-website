import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'editor', description: 'Tên vai trò duy nhất', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: 'Can edit content', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    example: [1, 2, 5],
    description: 'Danh sách ID quyền cần gán ngay',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  permissionIds?: number[];
}
