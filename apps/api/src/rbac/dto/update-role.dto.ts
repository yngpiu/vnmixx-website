import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'editor', description: 'Unique role name', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 'Can edit content', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}
