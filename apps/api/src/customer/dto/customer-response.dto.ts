import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerListItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  fullName: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: '+84901234567' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiPropertyOptional({ enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true })
  gender: string | null;

  @ApiProperty({ enum: ['PENDING_VERIFICATION', 'ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'INACTIVE';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  deletedAt: Date | null;
}

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

export class CustomerListResponseDto {
  @ApiProperty({ type: [CustomerListItemResponseDto] })
  data: CustomerListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class CustomerDetailResponseDto extends CustomerListItemResponseDto {
  @ApiPropertyOptional({ example: '1999-12-31', nullable: true })
  dob: Date | null;

  @ApiPropertyOptional({ nullable: true })
  emailVerifiedAt: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: { addresses: 2 } })
  _count: { addresses: number };
}
