import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ROLE_SORT_BY = ['name', 'description', 'updatedAt', 'createdAt', 'permissionCount'] as const;

export class ListRolesQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'quản',
    description: 'Tìm theo tên hoặc mô tả vai trò',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'name', enum: ROLE_SORT_BY })
  @IsString()
  @IsIn([...ROLE_SORT_BY])
  @IsOptional()
  sortBy?: (typeof ROLE_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
