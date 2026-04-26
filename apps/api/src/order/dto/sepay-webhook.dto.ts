import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class SepayWebhookDto {
  @ApiProperty({ example: 123456 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ example: 'MBBank' })
  @IsString()
  gateway: string;

  @ApiProperty({ example: '2024-03-20 10:15:00' })
  @IsString()
  transactionDate: string;

  @ApiProperty({ example: '0901234567', nullable: true })
  @IsOptional()
  @IsString()
  accountNumber?: string | null;

  @ApiProperty({ example: null, nullable: true })
  @IsOptional()
  @IsString()
  subAccount?: string | null;

  @ApiProperty({ example: 'in', enum: ['in', 'out'] })
  @IsEnum(['in', 'out'] as const)
  transferType: 'in' | 'out';

  @ApiProperty({ example: 500000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  transferAmount: number;

  @ApiProperty({ example: 1500000, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  accumulated?: number | null;

  @ApiProperty({ example: 'FT12345678', nullable: true })
  @IsOptional()
  @IsString()
  code?: string | null;

  @ApiProperty({ example: 'DHVNM240320ABCD thanh toan don hang' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'MB123456', nullable: true })
  @IsOptional()
  @IsString()
  referenceCode?: string | null;

  @ApiProperty({ example: 'Giao dich tu Mobile Banking', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;
}
