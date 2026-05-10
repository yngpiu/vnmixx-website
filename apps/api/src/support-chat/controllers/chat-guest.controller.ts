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
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../../auth/decorators';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { ChatDetailResponseDto, MessagesListResponseDto } from '../dto';
import { MessagesQueryDto } from '../dto/messages-query.dto';
import {
  GUEST_CHAT_COOKIE_NAME,
  GUEST_CHAT_COOKIE_OPTIONS,
  GuestSessionService,
} from '../services/guest-session.service';
import { SupportChatService } from '../services/support-chat.service';

@ApiTags('Support Chat (Khách ẩn danh)')
@Public()
@ApiExtraModels(ChatDetailResponseDto, MessagesListResponseDto)
@Controller('guest/support-chats')
/**
 * Controller xử lý các yêu cầu chat hỗ trợ từ khách ẩn danh (không đăng nhập).
 * Xác thực bằng HttpOnly cookie chứa guest secret.
 */
export class ChatGuestController {
  constructor(
    private readonly chatService: SupportChatService,
    private readonly guestSessionService: GuestSessionService,
  ) {}

  /** Tạo hoặc lấy cuộc hội thoại hỗ trợ cho khách ẩn danh. */
  @ApiOperation({ summary: 'Tạo hoặc lấy cuộc hội thoại hỗ trợ (khách ẩn danh)' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ChatDetailResponseDto) }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async findOrCreateChat(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SuccessPayload<ChatDetailResponseDto>> {
    const existingSecret = this.extractGuestSecret(req);
    if (existingSecret) {
      const secretHash = this.guestSessionService.hashSecret(existingSecret);
      const chat = await this.chatService.findOrCreateGuestChat(secretHash);
      return ok(chat, 'Lấy cuộc hội thoại hỗ trợ thành công.');
    }
    const { secret, secretHash } = this.guestSessionService.generateSecret();
    const chat = await this.chatService.findOrCreateGuestChat(secretHash);
    res.cookie(GUEST_CHAT_COOKIE_NAME, secret, GUEST_CHAT_COOKIE_OPTIONS);
    return ok(chat, 'Tạo cuộc hội thoại hỗ trợ thành công.');
  }

  /** Lấy danh sách tin nhắn trong cuộc hội thoại của khách ẩn danh. */
  @ApiOperation({ summary: 'Lấy danh sách tin nhắn cuộc hội thoại (khách ẩn danh)' })
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
    @Req() req: Request,
  ): Promise<SuccessPayload<MessagesListResponseDto>> {
    const secretHash = this.requireGuestSecretHash(req);
    const isOwner = await this.chatService.isGuestOwner(id, secretHash);
    if (!isOwner) {
      throw new ForbiddenException('Bạn không có quyền truy cập cuộc hội thoại này.');
    }
    return ok(await this.chatService.getMessages(id, query), 'Lấy lịch sử tin nhắn thành công.');
  }

  // ─── Private helpers ───────────────────────────────────────────────

  private extractGuestSecret(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[GUEST_CHAT_COOKIE_NAME] || undefined;
  }

  private requireGuestSecretHash(req: Request): string {
    const secret = this.extractGuestSecret(req);
    if (!secret) {
      throw new ForbiddenException('Không tìm thấy phiên khách ẩn danh.');
    }
    return this.guestSessionService.hashSecret(secret);
  }
}
