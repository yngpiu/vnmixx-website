import { ApiProperty } from '@nestjs/swagger';

export class EmployeeRoleItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'admin' })
  name: string;

  @ApiProperty({ example: 'Full access', nullable: true })
  description: string | null;
}

export class EmployeeRolesResponseDto {
  @ApiProperty({ example: 5 })
  employeeId: number;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName: string;

  @ApiProperty({ example: 'a@vnmixx.vn' })
  email: string;

  @ApiProperty({ type: [EmployeeRoleItemDto] })
  roles: EmployeeRoleItemDto[];
}
