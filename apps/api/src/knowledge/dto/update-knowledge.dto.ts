import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateKnowledgeDto {
  @ApiPropertyOptional({ example: 'chinh-sach-doi-tra', maxLength: 100 })
  @IsString()
  @MinLength(2, { message: 'Slug phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Slug không được vượt quá 100 ký tự' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường, số và dấu gạch nối giữa các từ',
  })
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Chính sách đổi trả', maxLength: 255 })
  @IsString()
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: '<p>Nội dung...</p>' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'isActive phải là boolean' })
  @IsOptional()
  isActive?: boolean;
}
