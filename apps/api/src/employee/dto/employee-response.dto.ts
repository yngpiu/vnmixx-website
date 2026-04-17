import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const EMPLOYEE_STATUS = ['ACTIVE', 'INACTIVE'] as const;

class RoleBriefDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'ADMIN' })
  name: string;
}

class EmployeeRoleDto {
  @ApiProperty({ type: RoleBriefDto })
  role: RoleBriefDto;
}

export class EmployeeListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Trần Thị B' })
  fullName: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;

  @ApiProperty({ example: '+84901234567' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: EMPLOYEE_STATUS })
  status: (typeof EMPLOYEE_STATUS)[number];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ type: [EmployeeRoleDto] })
  employeeRoles: EmployeeRoleDto[];
}

class PaginationMeta {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

export class EmployeeListResponseDto {
  @ApiProperty({ type: [EmployeeListItemResponseDto] })
  data: EmployeeListItemResponseDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;
}

export class EmployeeDetailResponseDto extends EmployeeListItemResponseDto {
  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
