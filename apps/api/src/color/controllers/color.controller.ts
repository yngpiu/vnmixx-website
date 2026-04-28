import { Controller, Get } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { ColorResponseDto } from '../dto';
import { ColorService } from '../services/color.service';

// Endpoint công khai để khách hàng tra cứu bảng màu sắc của sản phẩm.
@ApiTags('Colors')
@ApiExtraModels(ColorResponseDto)
@Controller('colors')
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  // Lấy toàn bộ màu sắc hiện có để hiển thị trong các bộ lọc tìm kiếm của khách hàng.
  @ApiOperation({ summary: 'Lấy danh sách màu sắc' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(ColorResponseDto) },
    }),
  })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(): Promise<SuccessPayload<ColorResponseDto[]>> {
    return ok(await this.colorService.findAllPublic(), 'Lấy danh sách màu sắc thành công.');
  }
}
