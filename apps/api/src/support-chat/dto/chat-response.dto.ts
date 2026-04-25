import { ApiProperty } from '@nestjs/swagger';

/**
 * ChatMessageResponseDto: DTO phản hồi một tin nhắn trong cuộc hội thoại.
 */
export class ChatMessageResponseDto {
  @ApiProperty({ example: 42 })
  id!: number;

  @ApiProperty({ example: 1 })
  chatId!: number;

  @ApiProperty({ enum: ['CUSTOMER', 'EMPLOYEE'], example: 'CUSTOMER' })
  senderType!: 'CUSTOMER' | 'EMPLOYEE';

  @ApiProperty({ nullable: true, example: 5 })
  senderCustomerId!: number | null;

  @ApiProperty({ nullable: true, example: null })
  senderEmployeeId!: number | null;

  @ApiProperty({ nullable: true, example: 'Nguyễn Văn A' })
  senderName!: string | null;

  @ApiProperty({ example: 'Tôi cần hỗ trợ về đơn hàng #12345' })
  content!: string;

  @ApiProperty({ example: '2026-04-26T01:00:00.000Z' })
  createdAt!: Date;
}

/**
 * ChatSummaryResponseDto: DTO phản hồi thông tin tóm tắt của cuộc hội thoại.
 */
export class ChatSummaryResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  customerId!: number;

  @ApiProperty({ example: 'Trần Thị B' })
  customerName!: string;

  @ApiProperty({ nullable: true, example: 'Hỗ trợ đơn hàng' })
  lastMessageContent!: string | null;

  @ApiProperty({ nullable: true, example: '2026-04-26T01:30:00.000Z' })
  lastMessageAt!: Date | null;

  @ApiProperty({ type: [String], example: ['Nhân viên A', 'Nhân viên B'] })
  assignedEmployeeNames!: string[];

  @ApiProperty({ example: '2026-04-26T01:00:00.000Z' })
  createdAt!: Date;
}

/**
 * ChatDetailResponseDto: DTO phản hồi chi tiết cuộc hội thoại kèm danh sách nhân viên phân công.
 */
export class ChatDetailResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 10 })
  customerId!: number;

  @ApiProperty({ example: 'Trần Thị B' })
  customerName!: string;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        employeeId: { type: 'number', example: 3 },
        employeeName: { type: 'string', example: 'Nhân viên A' },
        assignedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  assignments!: { employeeId: number; employeeName: string; assignedAt: Date }[];

  @ApiProperty({ example: '2026-04-26T01:00:00.000Z' })
  createdAt!: Date;
}

/**
 * ChatListResponseDto: DTO phản hồi danh sách cuộc hội thoại có phân trang.
 */
export class ChatListResponseDto {
  @ApiProperty({ type: [ChatSummaryResponseDto] })
  items!: ChatSummaryResponseDto[];

  @ApiProperty({ example: 45 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  pageSize!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

/**
 * MessagesListResponseDto: DTO phản hồi danh sách tin nhắn với cursor pagination.
 */
export class MessagesListResponseDto {
  @ApiProperty({ type: [ChatMessageResponseDto] })
  items!: ChatMessageResponseDto[];

  @ApiProperty({
    nullable: true,
    description: 'Cursor cho trang tiếp theo. Null nếu hết.',
    example: 120,
  })
  nextCursor!: number | null;

  @ApiProperty({ description: 'Còn tin nhắn cũ hơn không.', example: true })
  hasMore!: boolean;
}
