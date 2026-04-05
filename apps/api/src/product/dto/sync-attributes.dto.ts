import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Min } from 'class-validator';

export class SyncAttributesDto {
  @ApiProperty({ example: [1, 5, 12], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  attributeValueIds: number[];
}
