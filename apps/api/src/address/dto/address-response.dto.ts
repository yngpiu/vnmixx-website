import { ApiProperty } from '@nestjs/swagger';

class LocationItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  name: string;
}

export class AddressResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: '0901234567' })
  phoneNumber: string;

  @ApiProperty({ example: '123 Nguyễn Huệ' })
  addressLine: string;

  @ApiProperty({ enum: ['HOME', 'OFFICE'], example: 'HOME' })
  type: string;

  @ApiProperty({ example: true })
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: LocationItemDto })
  city: LocationItemDto;

  @ApiProperty({ type: LocationItemDto })
  district: LocationItemDto;

  @ApiProperty({ type: LocationItemDto })
  ward: LocationItemDto;
}
