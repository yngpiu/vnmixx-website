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
import { buildSuccessResponseSchema } from '../../common/swagger/response-schema.util';
import { ok, type SuccessPayload } from '../../common/utils/response.util';
import { SizeResponseDto } from '../dto';
import { SizeService } from '../services/size.service';

// Endpoint công khai để khách hàng tra cứu các kích thước sản phẩm (S, M, L, XL, v.v.).
@ApiTags('Sizes')
@ApiExtraModels(SizeResponseDto)
@Controller('sizes')
export class SizeController {
  constructor(private readonly sizeService: SizeService) {}

  // Liệt kê toàn bộ kích thước để khách hàng lựa chọn khi mua sắm.
  @ApiOperation({ summary: 'Liệt kê tất cả kích thước' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(SizeResponseDto) },
    }),
  })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(): Promise<SuccessPayload<SizeResponseDto[]>> {
    return ok(await this.sizeService.findAllPublic(), 'Lấy danh sách kích thước thành công.');
  }
}
