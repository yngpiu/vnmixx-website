import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { SizeResponseDto } from '../dto';
import { SizeService } from '../services/size.service';

// Endpoint công khai để khách hàng tra cứu các kích thước sản phẩm (S, M, L, XL, v.v.).
@ApiTags('Sizes')
@Controller('sizes')
export class SizeController {
  constructor(private readonly sizeService: SizeService) {}

  // Liệt kê toàn bộ kích thước để khách hàng lựa chọn khi mua sắm.
  @ApiOperation({ summary: 'Liệt kê tất cả kích thước' })
  @ApiOkResponse({ type: [SizeResponseDto] })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findAll(): Promise<SizeResponseDto[]> {
    return this.sizeService.findAllPublic();
  }
}
