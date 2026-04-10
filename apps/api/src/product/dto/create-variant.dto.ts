import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  colorId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sizeId: number;

  @ApiProperty({ example: 'BT-WHITE-L', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ example: 299000 })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 249000, nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  salePrice?: number;

  @ApiProperty({ example: 50, description: 'Tồn kho thực tế ban đầu' })
  @IsInt()
  @Min(0)
  onHand: number;
}
