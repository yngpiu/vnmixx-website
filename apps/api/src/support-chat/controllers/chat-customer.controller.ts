import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { ChatDetailResponseDto, MessagesListResponseDto } from '../dto/chat-response.dto';
import { MessagesQueryDto } from '../dto/messages-query.dto';
import { SupportChatService } from '../services/support-chat.service';

// Tiếp nhận yêu cầu chat hỗ trợ từ phía khách hàng.
// Cho phép tạo/lấy cuộc hội thoại và xem lịch sử tin nhắn.
@ApiTags('Support Chat (Khách hàng)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@ApiExtraModels(ChatDetailResponseDto, MessagesListResponseDto)
@Controller('customer/support-chat')
export class ChatCustomerController {
  constructor(private readonly chatService: SupportChatService) {}

  // Tạo hoặc lấy cuộc hội thoại hiện tại của khách hàng (mỗi khách chỉ có 1 chat).
  @ApiOperation({ summary: 'Tạo hoặc lấy cuộc hội thoại hỗ trợ.' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findOrCreateChat(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatDetailResponseDto>> {
    return ok(
      await this.chatService.findOrCreateChat(user.id),
      'Lấy cuộc hội thoại hỗ trợ thành công.',
    );
  }

  // Lấy cuộc hội thoại đang hoạt động của khách.
  @ApiOperation({ summary: 'Lấy cuộc hội thoại hỗ trợ hiện tại.' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Chưa có cuộc hội thoại nào.' })
  @Get('active')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getActiveChat(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatDetailResponseDto | null>> {
    return ok(
      await this.chatService.findChatByCustomer(user.id),
      'Lấy cuộc hội thoại hỗ trợ thành công.',
    );
  }

  // Lấy lịch sử tin nhắn trong cuộc hội thoại với cursor pagination.
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn.' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(MessagesListResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @Get(':id/messages')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MessagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<MessagesListResponseDto>> {
    const isOwner = await this.chatService.isCustomerOwner(id, user.id);
    if (!isOwner) {
      throw new ForbiddenException('Bạn không có quyền truy cập cuộc hội thoại này.');
    }
    return ok(await this.chatService.getMessages(id, query), 'Lấy lịch sử tin nhắn thành công.');
  }
}
