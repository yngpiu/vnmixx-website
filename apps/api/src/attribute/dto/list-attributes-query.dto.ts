import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const ATTRIBUTE_SORT_BY = ['name', 'valueCount', 'updatedAt'] as const;

export class ListAttributesQueryDto {
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
    example: 'chất',
    description: 'Tìm theo tên thuộc tính',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'updatedAt', enum: ATTRIBUTE_SORT_BY })
  @IsString()
  @IsIn([...ATTRIBUTE_SORT_BY])
  @IsOptional()
  sortBy?: (typeof ATTRIBUTE_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'desc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
