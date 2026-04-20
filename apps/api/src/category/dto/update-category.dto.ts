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

/**
 * UpdateCategoryDto: DTO dùng để cập nhật thông tin danh mục hiện có.
 * Tất cả các trường đều là tùy chọn.
 */
export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Áo sơ mi', description: 'Tên danh mục', maxLength: 100 })
  @IsString({ message: 'Tên danh mục phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsOptional()
  @MaxLength(100, { message: 'Tên danh mục không được vượt quá 100 ký tự' })
  name?: string;

  @ApiPropertyOptional({
    example: 'ao-so-mi',
    description: 'Slug thân thiện URL (chữ thường, chỉ dùng dấu gạch nối)',
    maxLength: 120,
  })
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsOptional()
  @MaxLength(120, { message: 'Slug không được vượt quá 120 ký tự' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ được chứa chữ thường, số và dấu gạch nối',
  })
  slug?: string;

  @ApiPropertyOptional({ example: false, description: 'Danh mục nổi bật hay không' })
  @IsBoolean({ message: 'Trạng thái nổi bật phải là kiểu boolean' })
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Đang hiển thị trên shop hay không' })
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Thứ tự hiển thị', minimum: 0 })
  @IsInt({ message: 'Thứ tự hiển thị phải là số nguyên' })
  @IsOptional()
  @Min(0, { message: 'Thứ tự hiển thị phải lớn hơn hoặc bằng 0' })
  sortOrder?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID danh mục cha (null để chuyển lên gốc, tối thiểu: 1)',
    nullable: true,
    minimum: 1,
  })
  @IsInt({ message: 'ID danh mục cha phải là số nguyên' })
  @IsOptional()
  @Min(1, { message: 'ID danh mục cha phải lớn hơn hoặc bằng 1' })
  parentId?: number | null;
}
