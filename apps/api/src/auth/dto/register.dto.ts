import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

enum GenderInput {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

/** DTO for customer registration. Employees are created by admins. */
export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Full name', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    example: 'customer@example.com',
    description: 'Unique email address',
    maxLength: 255,
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: '+84901234567',
    description: 'Phone number in any standard format',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+\-\s()]+$/, { message: 'phoneNumber must be a valid phone number' })
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({
    example: 'Str0ngP@ssword!',
    description: 'Password (8–72 characters)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiPropertyOptional({ example: '1999-12-31', description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dob must be in YYYY-MM-DD format' })
  dob?: string;

  @ApiPropertyOptional({ enum: GenderInput, example: GenderInput.MALE, description: 'Gender' })
  @IsOptional()
  @IsEnum(GenderInput)
  gender?: GenderInput;
}
