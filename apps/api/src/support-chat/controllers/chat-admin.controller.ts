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
  ApiBadRequestResponse,
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
} from '../dto';
import { ListChatsQueryDto } from '../dto/list-chats-query.dto';
import { MessagesQueryDto } from '../dto/messages-query.dto';
import { SupportChatGateway } from '../gateway/support-chat.gateway';
import { SupportChatService } from '../services/support-chat.service';

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
// Controller xử lý các yêu cầu quản lý chat hỗ trợ dành cho nhân viên.
export class ChatAdminController {
  constructor(
    private readonly chatService: SupportChatService,
    private readonly chatGateway: SupportChatGateway,
  ) {}

  // Lấy danh sách các cuộc hội thoại hỗ trợ với tùy chọn phân trang và lọc theo nhân viên.
  @ApiOperation({ summary: 'Lấy danh sách cuộc hội thoại hỗ trợ' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatListResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Tham số truy vấn không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async getChats(
    @Query() query: ListChatsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatListResponseDto>> {
    return ok(
      await this.chatService.getAdminChats(query, user.id),
      'Lấy danh sách cuộc hội thoại thành công.',
    );
  }

  // Lấy thông tin chi tiết của một cuộc hội thoại cụ thể dựa trên ID.
  @ApiOperation({ summary: 'Lấy chi tiết cuộc hội thoại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @ApiBadRequestResponse({ description: 'ID cuộc hội thoại không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':id')
  async getChatDetail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<ChatDetailResponseDto>> {
    return ok(await this.chatService.getChatDetail(id), 'Lấy chi tiết cuộc hội thoại thành công.');
  }

  // Lấy toàn bộ lịch sử tin nhắn của một cuộc hội thoại với phân trang cursor.
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn cuộc hội thoại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(MessagesListResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @ApiBadRequestResponse({ description: 'Tham số không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: MessagesQueryDto,
  ): Promise<SuccessPayload<MessagesListResponseDto>> {
    return ok(await this.chatService.getMessages(id, query), 'Lấy lịch sử tin nhắn thành công.');
  }

  // Nhân viên thực hiện tự phân công mình vào một cuộc hội thoại để bắt đầu hỗ trợ.
  @ApiOperation({ summary: 'Phân công bản thân vào cuộc hội thoại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @ApiConflictResponse({ description: 'Bạn đã được phân công vào cuộc hội thoại này.' })
  @ApiBadRequestResponse({ description: 'ID cuộc hội thoại không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @RequirePermissions('support-chat.create')
  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assignSelf(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatDetailResponseDto>> {
    const chatDetail = await this.chatService.assignEmployee(id, user.id);
    this.chatGateway.emitChatAssigned(id, chatDetail);
    return ok(chatDetail, 'Phân công vào cuộc hội thoại thành công.');
  }
}
