import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

enum GenderInput {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '+84901234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '1999-12-31', description: 'Ngày sinh (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'ngày sinh phải theo định dạng YYYY-MM-DD' })
  dob?: string;

  @ApiPropertyOptional({ enum: GenderInput, example: GenderInput.MALE })
  @IsOptional()
  @IsEnum(GenderInput)
  gender?: GenderInput;

  @ApiPropertyOptional({ example: true, description: 'Kích hoạt hoặc vô hiệu hóa khách hàng' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
