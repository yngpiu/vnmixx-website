import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateVariantDto {
  @ApiPropertyOptional({ example: 299000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 50, description: 'Cập nhật tồn kho thực tế (on hand)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  onHand?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
