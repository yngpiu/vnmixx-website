import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const SIZE_SORT_BY = ['label', 'sortOrder', 'updatedAt'] as const;

export class ListSizesQueryDto {
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
    example: 'M',
    description: 'Tìm theo nhãn kích cỡ',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'sortOrder', enum: SIZE_SORT_BY })
  @IsString()
  @IsIn([...SIZE_SORT_BY])
  @IsOptional()
  sortBy?: (typeof SIZE_SORT_BY)[number];

  @ApiPropertyOptional({ example: 'asc', enum: ['asc', 'desc'] })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
