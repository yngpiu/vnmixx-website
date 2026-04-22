import { Controller, Get } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { ColorResponseDto } from '../dto';
import { ColorService } from '../services/color.service';

// Endpoint công khai để khách hàng tra cứu bảng màu sắc của sản phẩm.
@ApiTags('Colors')
@Controller('colors')
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  // Liệt kê toàn bộ màu sắc hiện có để hiển thị trong các bộ lọc tìm kiếm của khách hàng.
  @ApiOperation({ summary: 'Liệt kê tất cả màu sắc' })
  @ApiOkResponse({ type: [ColorResponseDto] })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findAll(): Promise<ColorResponseDto[]> {
    return this.colorService.findAllPublic();
  }
}
