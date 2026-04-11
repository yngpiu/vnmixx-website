import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { TransformQueryOptionalBoolean } from '../../common/transforms/query-optional-boolean.transform';

export class ListAdminProductsQueryDto {
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

  @ApiPropertyOptional({ example: 'basic tee' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  categoryId?: number;

  @ApiPropertyOptional({ example: true })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @TransformQueryOptionalBoolean()
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}
