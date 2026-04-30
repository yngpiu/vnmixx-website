import { Body, Controller, Headers, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ok, type SuccessPayload } from '../../common/utils/response.util';
import { SepayWebhookDto } from '../dto/sepay-webhook.dto';
import { OrderService } from '../services/order.service';

@ApiTags('Payments')
@Controller('payments/webhooks')
// Tiếp nhận và xử lý các thông báo giao dịch tự động từ cổng thanh toán SePay.
export class SepayWebhookController {
  private readonly logger = new Logger(SepayWebhookController.name);

  constructor(private readonly orderService: OrderService) {}

  // Xử lý thông tin chuyển khoản từ ngân hàng gửi qua SePay để tự động xác nhận thanh toán đơn hàng.
  @ApiOperation({ summary: 'Nhận webhook giao dịch từ SePay' })
  @ApiOkResponse({ description: 'Webhook được xử lý thành công.' })
  @ApiUnauthorizedResponse({ description: 'Authorization header không hợp lệ.' })
  @ApiBadRequestResponse({ description: 'Payload webhook không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post('sepay')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: SepayWebhookDto,
  ): Promise<SuccessPayload<{ duplicate: boolean; matched: boolean; orderCode?: string }>> {
    this.logger.log(
      `Received SePay webhook: id=${payload.id}, transferType=${payload.transferType}, amount=${payload.transferAmount}, hasAuthorization=${Boolean(authorization)}`,
    );
    const result = await this.orderService.handleSepayWebhook(authorization, payload);
    this.logger.log(
      `Processed SePay webhook: id=${payload.id}, duplicate=${result.duplicate}, matched=${result.matched}, orderCode=${result.orderCode ?? 'N/A'}`,
    );

    return ok(result, 'Xử lý webhook SePay thành công.');
  }
}
