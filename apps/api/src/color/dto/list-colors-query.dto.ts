import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const COLOR_SORT_BY = ['name', 'hexCode', 'updatedAt'] as const;

export class ListColorsQueryDto {
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
    example: 'trắng',
    description: 'Tìm theo tên hoặc mã HEX',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'name', enum: COLOR_SORT_BY })
  @IsString()
  @IsIn([...COLOR_SORT_BY])
  @IsOptional()
  sortBy?: (typeof COLOR_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
