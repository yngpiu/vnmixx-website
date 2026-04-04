import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ListCategoriesQueryDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Include soft-deleted categories in the result',
    default: false,
  })
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  includeDeleted?: boolean;
}
