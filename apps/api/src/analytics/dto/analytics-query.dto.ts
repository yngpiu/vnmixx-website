import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

const MAX_ANALYTICS_RANGE_DAYS = 366;

export class AnalyticsDateRangeQueryDto {
  @ApiProperty({
    example: '2026-01-01',
    description: 'Ngày bắt đầu kỳ (ISO date), inclusive theo UTC start-of-day.',
  })
  @IsDateString({}, { message: 'from phải là chuỗi ngày ISO hợp lệ' })
  from!: string;

  @ApiProperty({
    example: '2026-01-31',
    description: 'Ngày cuối kỳ (ISO date), inclusive theo UTC end-of-day.',
  })
  @IsDateString({}, { message: 'to phải là chuỗi ngày ISO hợp lệ' })
  to!: string;
}

export class AnalyticsTimeseriesQueryDto extends AnalyticsDateRangeQueryDto {
  @ApiPropertyOptional({ enum: ['day'], default: 'day' })
  @IsOptional()
  @IsEnum(['day'] as const, { message: 'granularity hiện chỉ hỗ trợ day' })
  granularity = 'day' as const;
}

export class AnalyticsTopCitiesQueryDto extends AnalyticsDateRangeQueryDto {
  @ApiPropertyOptional({ example: 8, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit phải là số nguyên' })
  @Min(1, { message: 'limit tối thiểu 1' })
  @Max(50, { message: 'limit tối đa 50' })
  limit?: number = 8;
}

export function assertAnalyticsRangeWithinMaxDays(
  fromUtc: Date,
  toUtc: Date,
): { ok: true } | { ok: false; message: string } {
  if (fromUtc.getTime() > toUtc.getTime()) {
    return { ok: false, message: 'from không được sau to.' };
  }
  const diffMs = toUtc.getTime() - fromUtc.getTime();
  const days = diffMs / 86_400_000 + 1;
  if (days > MAX_ANALYTICS_RANGE_DAYS) {
    return {
      ok: false,
      message: `Khoảng thời gian không được vượt quá ${MAX_ANALYTICS_RANGE_DAYS} ngày.`,
    };
  }
  return { ok: true };
}
