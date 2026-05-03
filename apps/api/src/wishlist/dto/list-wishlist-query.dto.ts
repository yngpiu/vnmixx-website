import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ListWishlistQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Trang phải là số nguyên.' })
  @Min(1, { message: 'Trang phải lớn hơn hoặc bằng 1.' })
  @IsOptional()
  page?: number = 1;
  @ApiPropertyOptional({ example: 12, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: 'Giới hạn phải là số nguyên.' })
  @Min(1, { message: 'Giới hạn phải lớn hơn hoặc bằng 1.' })
  @Max(100, { message: 'Giới hạn không được vượt quá 100.' })
  @IsOptional()
  limit?: number = 12;
}
