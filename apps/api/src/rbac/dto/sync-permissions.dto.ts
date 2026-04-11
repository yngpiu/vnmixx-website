import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SyncPermissionsDto {
  @ApiProperty({
    example: [1, 3, 5],
    description: 'Danh sách ID quyền gán cho vai trò (có thể rỗng để gỡ hết).',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  permissionIds: number[];
}
