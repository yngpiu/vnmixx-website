import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateImageDto {
  @ApiProperty({ example: 'https://example.com/image.jpg', maxLength: 500 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  colorId?: number;

  @ApiPropertyOptional({ example: 'Trắng - mặt trước', maxLength: 255, nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
