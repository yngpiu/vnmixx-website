import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SepayWebhookDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsString()
  gateway: string;

  @IsString()
  transactionDate: string;

  @IsOptional()
  @IsString()
  accountNumber?: string | null;

  @IsOptional()
  @IsString()
  subAccount?: string | null;

  @IsEnum(['in', 'out'] as const)
  transferType: 'in' | 'out';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  transferAmount: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  accumulated?: number | null;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  referenceCode?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
