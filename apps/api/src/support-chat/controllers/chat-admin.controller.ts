import {
  Controller,
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
  ApiConflictResponse,
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
import { CurrentUser, RequirePermissions, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  ChatDetailResponseDto,
  ChatListResponseDto,
  ChatSummaryResponseDto,
  MessagesListResponseDto,
} from '../dto/chat-response.dto';
import { ListChatsQueryDto } from '../dto/list-chats-query.dto';
import { MessagesQueryDto } from '../dto/messages-query.dto';
import { SupportChatGateway } from '../gateway/support-chat.gateway';
import { SupportChatService } from '../services/support-chat.service';

// Tiếp nhận yêu cầu quản lý chat hỗ trợ từ phía nhân viên.
// Cho phép xem danh sách, chi tiết, lịch sử tin nhắn và phân công nhân viên vào cuộc hội thoại.
@ApiTags('Support Chat (Admin)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@RequirePermissions('support-chat.read')
@ApiExtraModels(
  ChatListResponseDto,
  ChatDetailResponseDto,
  ChatSummaryResponseDto,
  MessagesListResponseDto,
)
@Controller('admin/support-chats')
export class ChatAdminController {
  constructor(
    private readonly chatService: SupportChatService,
    private readonly chatGateway: SupportChatGateway,
  ) {}

  // Lấy danh sách tất cả cuộc hội thoại hỗ trợ với phân trang.
  @ApiOperation({ summary: 'Danh sách cuộc hội thoại hỗ trợ (phân trang).' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatListResponseDto) }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getChats(
    @Query() query: ListChatsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatListResponseDto>> {
    return ok(
      await this.chatService.getAdminChats(query, user.id),
      'Lấy danh sách cuộc hội thoại thành công.',
    );
  }

  // Xem chi tiết cuộc hội thoại bao gồm danh sách nhân viên phân công.
  @ApiOperation({ summary: 'Chi tiết cuộc hội thoại.' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getChatDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<ChatDetailResponseDto>> {
    return ok(await this.chatService.getChatDetail(id), 'Lấy chi tiết cuộc hội thoại thành công.');
  }

  // Lấy lịch sử tin nhắn trong cuộc hội thoại.
  @ApiOperation({ summary: 'Lịch sử tin nhắn cuộc hội thoại.' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(MessagesListResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @Get(':id/messages')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MessagesQueryDto,
  ): Promise<SuccessPayload<MessagesListResponseDto>> {
    return ok(await this.chatService.getMessages(id, query), 'Lấy lịch sử tin nhắn thành công.');
  }

  // Nhân viên tự phân công mình vào cuộc hội thoại để hỗ trợ khách hàng.
  @ApiOperation({ summary: 'Phân công bản thân vào cuộc hội thoại.' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @ApiConflictResponse({ description: 'Bạn đã được phân công vào cuộc hội thoại này.' })
  @RequirePermissions('support-chat.create')
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async assignSelf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatDetailResponseDto>> {
    const chatDetail = await this.chatService.assignEmployee(id, user.id);
    this.chatGateway.emitChatAssigned(id, chatDetail);
    return ok(chatDetail, 'Phân công vào cuộc hội thoại thành công.');
  }
}
