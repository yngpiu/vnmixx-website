import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Bao gồm danh mục đã xóa mềm trong kết quả',
    default: false,
  })
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}
