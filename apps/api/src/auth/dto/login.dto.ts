import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** DTO for both customer and employee login. */
export class LoginDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Registered email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Str0ngP@ssword!',
    description: 'Account password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
