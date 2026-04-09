import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

enum GenderInput {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '1999-12-31', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'ngày sinh phải theo định dạng YYYY-MM-DD' })
  dob?: string;

  @ApiPropertyOptional({ enum: GenderInput, example: GenderInput.MALE })
  @IsOptional()
  @IsEnum(GenderInput)
  gender?: GenderInput;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;
}
