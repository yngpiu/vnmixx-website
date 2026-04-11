import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Trần Thị B', maxLength: 100 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'employee@example.com', maxLength: 255 })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '+84901234567', maxLength: 20 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  phoneNumber: string;

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: [1, 2],
    description: 'ID các vai trò gán cho nhân viên sau khi tạo',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  roleIds?: number[];
}
