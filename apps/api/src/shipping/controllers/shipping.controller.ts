import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { CalculateShippingFeeDto, ShippingFeeResponseDto } from '../dto';
import { ShippingService } from '../services/shipping.service';

// Xử lý các yêu cầu liên quan đến vận chuyển cho khách hàng.
@ApiTags('Shipping')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@ApiExtraModels(ShippingFeeResponseDto)
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  // Tính toán phí vận chuyển thực tế để thông báo cho khách hàng trước khi đặt hàng.
  @ApiOperation({ summary: 'Tính phí vận chuyển dựa trên địa chỉ nhận hàng và giỏ hàng' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ShippingFeeResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiBadRequestResponse({
    description: 'Giỏ hàng trống hoặc không có dịch vụ vận chuyển khả dụng.',
  })
  @Post('fee')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async calculateFee(
    @Body() dto: CalculateShippingFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<ShippingFeeResponseDto>> {
    return ok(
      await this.shippingService.calculateFee(user.id, dto),
      'Tính phí vận chuyển thành công.',
    );
  }
}
