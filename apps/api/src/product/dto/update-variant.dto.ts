import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateVariantDto {
  @ApiPropertyOptional({ example: 299000 })
  @IsInt({ message: 'Giá phải là số nguyên' })
  @Min(0, { message: 'Giá không được âm' })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 50, description: 'Cập nhật tồn kho thực tế (on hand)' })
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Số lượng tồn kho không được âm' })
  @IsOptional()
  onHand?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;
}
