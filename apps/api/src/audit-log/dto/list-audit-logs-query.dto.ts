import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AuditLogStatus } from '../../../generated/prisma/client';

function toOptionalUniqueIntArray(value: unknown): number[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const raw: unknown[] = Array.isArray(value) ? value : [value];
  const nums = raw
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isInteger(n) && n >= 1);
  return nums.length > 0 ? [...new Set(nums)] : undefined;
}

function toOptionalUniqueStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const raw: unknown[] = Array.isArray(value) ? value : [value];
  const strs = raw.map((v) => String(v).trim()).filter((s) => s.length > 0);
  return strs.length > 0 ? [...new Set(strs)] : undefined;
}

export class ListAuditLogsQueryDto {
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
    type: [Number],
    isArray: true,
    description: 'Lọc theo nhiều nhân viên (lặp query: actorEmployeeIds=1&actorEmployeeIds=2).',
  })
  @Transform(({ value }) => toOptionalUniqueIntArray(value))
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  actorEmployeeIds?: number[];

  @ApiPropertyOptional({
    example: 5,
    description: 'Single actor id (legacy); merged into actorEmployeeIds.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  actorEmployeeId?: number;

  @ApiPropertyOptional({ example: 'employee.update' })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({
    type: [String],
    isArray: true,
    description:
      'Lọc theo nhiều mã hành động (lặp query: actions=employee.create&actions=role.update).',
  })
  @Transform(({ value }) => toOptionalUniqueStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100)
  @IsOptional()
  actions?: string[];

  @ApiPropertyOptional({
    type: [String],
    isArray: true,
    description:
      'Lọc theo nhiều loại tài nguyên (lặp query: resourceTypes=order&resourceTypes=product).',
  })
  @Transform(({ value }) => toOptionalUniqueStringArray(value))
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  @IsOptional()
  resourceTypes?: string[];

  @ApiPropertyOptional({
    example: 'employee',
    description: 'Single resource type (legacy); merged into resourceTypes.',
  })
  @IsString()
  @IsOptional()
  resourceType?: string;

  @ApiPropertyOptional({ example: '42' })
  @IsString()
  @IsOptional()
  resourceId?: string;

  @ApiPropertyOptional({ enum: AuditLogStatus })
  @IsEnum(AuditLogStatus)
  @IsOptional()
  status?: AuditLogStatus;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  from?: Date;

  @ApiPropertyOptional({ example: '2026-01-31T23:59:59.999Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  to?: Date;
}
