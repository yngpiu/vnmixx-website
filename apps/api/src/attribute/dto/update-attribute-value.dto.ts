import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateAttributeValueDto {
  @ApiProperty({ example: '100% Cotton', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  value: string;
}
