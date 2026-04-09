import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class SyncPermissionsDto {
  @ApiProperty({ example: [1, 3, 5], description: 'Danh sách ID quyền cần gán', type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permissionIds: number[];
}
