import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { SizeResponseDto } from '../dto';
import { SizeService } from '../services/size.service';

/**
 * SizeController: Endpoint công khai cho kích thước sản phẩm.
 * Vai trò: Cung cấp danh sách các kích thước (S, M, L, XL, v.v.) cho khách hàng.
 */
@ApiTags('Sizes')
@Controller('sizes')
export class SizeController {
  constructor(private readonly sizeService: SizeService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả kích thước' })
  @ApiOkResponse({ type: [SizeResponseDto] })
  @Public()
  @Get()
  findAll(): Promise<SizeResponseDto[]> {
    return this.sizeService.findAllPublic();
  }
}
