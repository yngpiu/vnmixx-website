import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateKnowledgeDto {
  @ApiProperty({ example: 'chinh-sach-doi-tra', maxLength: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Slug không được để trống' })
  @MinLength(2, { message: 'Slug phải có ít nhất 2 ký tự' })
  @MaxLength(100, { message: 'Slug không được vượt quá 100 ký tự' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug chỉ gồm chữ thường, số và dấu gạch nối giữa các từ',
  })
  slug: string;

  @ApiProperty({ example: 'Chính sách đổi trả', maxLength: 255 })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(255, { message: 'Tiêu đề không được vượt quá 255 ký tự' })
  title: string;

  @ApiProperty({ example: '<p>Nội dung chính sách...</p>' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean({ message: 'isActive phải là boolean' })
  @IsOptional()
  isActive?: boolean;
}
