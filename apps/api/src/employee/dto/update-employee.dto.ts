import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Trần Thị B', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '+84901234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', maxLength: 500 })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Activate or deactivate employee' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
