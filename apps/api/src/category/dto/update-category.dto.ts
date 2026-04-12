import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Áo sơ mi', description: 'Tên danh mục', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 'ao-so-mi',
    description: 'Slug thân thiện URL (chữ thường, chỉ dùng dấu gạch nối)',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug chỉ được chứa chữ thường, số và dấu gạch nối',
  })
  slug?: string;

  @ApiPropertyOptional({ example: false, description: 'Danh mục nổi bật hay không' })
  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Đang hiển thị trên shop hay không' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Thứ tự hiển thị', minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID danh mục cha (null để chuyển lên gốc, tối thiểu: 1)',
    nullable: true,
    minimum: 1,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  parentId?: number | null;
}
