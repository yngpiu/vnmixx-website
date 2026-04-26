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
  ApiBadRequestResponse,
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
import { ChatDetailResponseDto, MessagesListResponseDto } from '../dto';
import { MessagesQueryDto } from '../dto/messages-query.dto';
import { SupportChatService } from '../services/support-chat.service';

@ApiTags('Support Chat (Khách hàng)')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@ApiExtraModels(ChatDetailResponseDto, MessagesListResponseDto)
@Controller('customer/support-chat')
// Controller xử lý các yêu cầu chat hỗ trợ từ phía khách hàng.
export class ChatCustomerController {
  constructor(private readonly chatService: SupportChatService) {}

  // Tạo cuộc hội thoại mới hoặc lấy lại cuộc hội thoại hiện có của khách hàng.
  @ApiOperation({ summary: 'Tạo hoặc lấy cuộc hội thoại hỗ trợ' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async findOrCreateChat(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatDetailResponseDto>> {
    return ok(
      await this.chatService.findOrCreateChat(user.id),
      'Lấy cuộc hội thoại hỗ trợ thành công.',
    );
  }

  // Truy xuất thông tin cuộc hội thoại đang hoạt động của khách hàng hiện tại.
  @ApiOperation({ summary: 'Lấy cuộc hội thoại hỗ trợ hiện tại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Chưa có cuộc hội thoại nào.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get('active')
  async getActiveChat(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ChatDetailResponseDto | null>> {
    return ok(
      await this.chatService.findChatByCustomer(user.id),
      'Lấy cuộc hội thoại hỗ trợ thành công.',
    );
  }

  // Lấy danh sách tin nhắn trong cuộc hội thoại của khách hàng với phân trang cursor.
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(MessagesListResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy cuộc hội thoại.' })
  @ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập cuộc hội thoại này.' })
  @ApiBadRequestResponse({ description: 'Tham số không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':id/messages')
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
