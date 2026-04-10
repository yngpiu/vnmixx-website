import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { CalculateShippingFeeDto, ShippingFeeResponseDto } from '../dto';
import { ShippingService } from '../services/shipping.service';

@ApiTags('Shipping')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @ApiOperation({ summary: 'Tính phí vận chuyển dựa trên địa chỉ nhận hàng và giỏ hàng' })
  @ApiOkResponse({ type: ShippingFeeResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiBadRequestResponse({
    description: 'Giỏ hàng trống hoặc không có dịch vụ vận chuyển khả dụng.',
  })
  @Post('fee')
  async calculateFee(
    @Body() dto: CalculateShippingFeeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShippingFeeResponseDto> {
    return this.shippingService.calculateFee(user.id, dto);
  }
}
