import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class DashboardDateRangeQueryDto {
  @ApiPropertyOptional({ example: '2024-05-01', description: 'YYYY-MM-DD hoặc ISO date string.' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2024-05-31', description: 'YYYY-MM-DD hoặc ISO date string.' })
  @IsString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ example: 'Asia/Ho_Chi_Minh' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'previous_period', enum: ['previous_period', 'none'] })
  @IsEnum(['previous_period', 'none'] as const)
  @IsOptional()
  compare?: 'previous_period' | 'none';
}

export class DashboardTrendQueryDto extends DashboardDateRangeQueryDto {
  @ApiPropertyOptional({ example: 'day', enum: ['day', 'month', 'year'] })
  @IsEnum(['day', 'month', 'year'] as const)
  @IsOptional()
  groupBy?: 'day' | 'month' | 'year';
}

export class DashboardTopProductsQueryDto extends DashboardDateRangeQueryDto {
  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'quantity', enum: ['quantity', 'revenue'] })
  @IsEnum(['quantity', 'revenue'] as const)
  @IsOptional()
  metric?: 'quantity' | 'revenue';
}

export class DashboardCategoryRevenueQueryDto extends DashboardDateRangeQueryDto {
  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;
}

export class DashboardRecentOrdersQueryDto {
  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number;
}
