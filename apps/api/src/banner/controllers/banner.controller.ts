import { Controller, Get, Query } from '@nestjs/common';
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
import { BannerResponseDto, ListBannersQueryDto } from '../dto';
import { BannerService } from '../services/banner.service';

@ApiTags('Banners')
@ApiExtraModels(BannerResponseDto)
@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @ApiOperation({ summary: 'Lấy danh sách banner đang hoạt động cho shop' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(BannerResponseDto) },
    }),
  })
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(@Query() query: ListBannersQueryDto): Promise<SuccessPayload<BannerResponseDto[]>> {
    return ok(
      await this.bannerService.findActivePublic({
        ...(query.placement !== undefined ? { placement: query.placement } : {}),
      }),
      'Lấy danh sách banner thành công.',
    );
  }
}
