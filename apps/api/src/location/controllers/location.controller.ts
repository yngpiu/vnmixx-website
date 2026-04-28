import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
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
import { CityResponseDto, DistrictResponseDto, WardResponseDto } from '../dto';
import { LocationService } from '../services/location.service';

@ApiTags('Locations')
@ApiExtraModels(CityResponseDto, DistrictResponseDto, WardResponseDto)
@Controller('locations')
// API công khai để tra cứu địa chỉ khi khách chọn nơi giao hàng.
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // Trả về toàn bộ tỉnh/thành để bắt đầu luồng chọn địa chỉ.
  @ApiOperation({ summary: 'Lấy danh sách tỉnh/thành phố' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(CityResponseDto) },
    }),
  })
  @Public()
  @Get('cities')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAllCities(): Promise<SuccessPayload<CityResponseDto[]>> {
    return ok(
      await this.locationService.findAllCities(),
      'Lấy danh sách tỉnh/thành phố thành công.',
    );
  }

  // Trả về danh sách quận/huyện thuộc thành phố đã chọn.
  @ApiOperation({ summary: 'Lấy danh sách quận/huyện theo thành phố' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(DistrictResponseDto) },
    }),
  })
  @ApiBadRequestResponse({ description: 'Mã thành phố không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thành phố.' })
  @Public()
  @Get('cities/:cityId/districts')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findDistrictsByCityId(
    @Param('cityId', ParseIntPipe) cityId: number,
  ): Promise<SuccessPayload<DistrictResponseDto[]>> {
    return ok(
      await this.locationService.findDistrictsByCityId(cityId),
      'Lấy danh sách quận/huyện thành công.',
    );
  }

  // Trả về danh sách phường/xã thuộc quận/huyện đã chọn.
  @ApiOperation({ summary: 'Lấy danh sách phường/xã theo quận/huyện' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(WardResponseDto) },
    }),
  })
  @ApiBadRequestResponse({ description: 'Mã quận/huyện không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy quận/huyện.' })
  @Public()
  @Get('districts/:districtId/wards')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findWardsByDistrictId(
    @Param('districtId', ParseIntPipe) districtId: number,
  ): Promise<SuccessPayload<WardResponseDto[]>> {
    return ok(
      await this.locationService.findWardsByDistrictId(districtId),
      'Lấy danh sách phường/xã thành công.',
    );
  }
}
