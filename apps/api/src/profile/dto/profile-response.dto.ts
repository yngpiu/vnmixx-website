/**
 * DTO phản hồi thông tin hồ sơ người dùng.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '+84901234567' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: '1999-12-31', nullable: true })
  dob: string | null;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true })
  gender: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class EmployeeProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Trần Thị B' })
  fullName: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: '+84901234567' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;
}
