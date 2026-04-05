import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSizeDto {
  @ApiProperty({ example: 'M', maxLength: 10 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  label: string;

  @ApiPropertyOptional({ example: 2, minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;
}
