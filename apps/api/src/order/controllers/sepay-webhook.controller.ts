import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
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
export class SepayWebhookController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Nhận webhook giao dịch từ SePay' })
  @ApiOkResponse({ description: 'Webhook được xử lý thành công.' })
  @ApiUnauthorizedResponse({ description: 'Authorization header không hợp lệ.' })
  @ApiBadRequestResponse({ description: 'Payload webhook không hợp lệ.' })
  @Post('sepay')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async handleWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: SepayWebhookDto,
  ): Promise<SuccessPayload<{ duplicate: boolean; matched: boolean; orderCode?: string }>> {
    const result: { duplicate: boolean; matched: boolean; orderCode?: string } =
      await this.orderService.handleSepayWebhook(authorization, payload);

    return ok(result, 'Xử lý webhook SePay thành công.');
  }
}
