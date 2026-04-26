import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLogStatus } from '../../../generated/prisma/client';

class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

class AuditActorDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Admin User' })
  fullName: string;

  @ApiProperty({ example: 'admin@example.com' })
  email: string;
}

export class AuditLogResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ type: AuditActorDto, nullable: true })
  actorEmployee: AuditActorDto | null;

  @ApiProperty({ example: 'employee.update' })
  action: string;

  @ApiProperty({ example: 'employee' })
  resourceType: string;

  @ApiPropertyOptional({ example: '42', nullable: true })
  resourceId: string | null;

  @ApiPropertyOptional({ example: '9525f86d-69a7-473c-bf9a-b731ed5859cc', nullable: true })
  requestId: string | null;

  @ApiPropertyOptional({ example: '127.0.0.1', nullable: true })
  ipAddress: string | null;

  @ApiPropertyOptional({ example: 'Mozilla/5.0', nullable: true })
  userAgent: string | null;

  @ApiPropertyOptional({ example: { name: 'Old Name' }, nullable: true })
  beforeData: unknown;

  @ApiPropertyOptional({ example: { name: 'New Name' }, nullable: true })
  afterData: unknown;

  @ApiProperty({ enum: AuditLogStatus, example: AuditLogStatus.SUCCESS })
  status: AuditLogStatus;

  @ApiPropertyOptional({ example: 'Không tìm thấy vai trò #2', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ example: '2024-03-20T10:00:00Z' })
  createdAt: Date;
}

export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data: AuditLogResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
