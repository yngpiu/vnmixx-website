import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class SyncEmployeeRolesDto {
  @ApiProperty({
    example: [1, 3],
    description: 'Danh sách ID vai trò cần gán (gửi mảng rỗng để gỡ toàn bộ vai trò)',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  roleIds: number[];
}
