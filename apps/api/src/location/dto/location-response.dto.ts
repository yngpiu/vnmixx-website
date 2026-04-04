import { ApiProperty } from '@nestjs/swagger';

export class CityResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '202' })
  giaohangnhanhId: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  name: string;
}

export class DistrictResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '1442' })
  giaohangnhanhId: string;

  @ApiProperty({ example: 'Quận 1' })
  name: string;

  @ApiProperty({ example: 1 })
  cityId: number;
}

export class WardResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '21012' })
  giaohangnhanhId: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  name: string;

  @ApiProperty({ example: 1 })
  districtId: number;
}
