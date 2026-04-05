import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateColorDto {
  @ApiProperty({ example: 'Trắng', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: '#FFFFFF', description: 'Hex color code (#RRGGBB)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'hexCode must be a valid hex color (e.g. #FF0000)' })
  hexCode: string;
}
