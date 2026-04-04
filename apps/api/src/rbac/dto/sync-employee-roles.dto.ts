import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SyncEmployeeRolesDto {
  @ApiProperty({
    example: [1, 3],
    description: 'Role IDs to assign (send empty array to remove all roles)',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
