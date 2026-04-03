import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/** Shape returned by login / verify OTP / refresh endpoints. */
export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Short-lived JWT access token (15 minutes by default)',
  })
  accessToken: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Opaque refresh token used to obtain a new token pair',
  })
  refreshToken: string;

  @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
  expiresIn: number;

  @ApiProperty({
    enum: ['CUSTOMER', 'EMPLOYEE'],
    example: 'CUSTOMER',
    description: 'Identifies which user type was authenticated',
  })
  userType: 'CUSTOMER' | 'EMPLOYEE';
}

/** Type alias kept for internal use where full class is not needed. */
export type AuthResponse = AuthResponseDto;

/** DTO for refreshing an access token. */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'The opaque refresh token issued at login',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

/** Shape returned by profile endpoint. */
export class ProfileResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ enum: ['CUSTOMER', 'EMPLOYEE'], example: 'CUSTOMER' })
  userType: 'CUSTOMER' | 'EMPLOYEE';

  @ApiProperty({ example: ['admin'], description: 'Employee roles (empty for customers)' })
  roles: string[];

  @ApiProperty({
    example: ['product.create'],
    description: 'Employee permissions (empty for customers)',
  })
  permissions: string[];
}
