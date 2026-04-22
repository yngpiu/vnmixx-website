import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CityResponseDto, DistrictResponseDto, WardResponseDto } from '../dto';
import { LocationService } from '../services/location.service';

// Cung cấp các API công khai để khách hàng tra cứu thông tin hành chính.
// Phục vụ việc lựa chọn địa chỉ giao hàng chính xác theo dữ liệu của đơn vị vận chuyển.
@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // Lấy danh sách toàn bộ tỉnh thành để khách hàng bắt đầu chọn địa chỉ.
  @ApiOperation({ summary: 'Liệt kê tất cả tỉnh/thành phố' })
  @ApiOkResponse({ type: [CityResponseDto] })
  @Public()
  @Get('cities')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAllCities(): Promise<CityResponseDto[]> {
    return this.locationService.findAllCities();
  }

  // Truy xuất các quận huyện thuộc một tỉnh thành cụ thể.
  @ApiOperation({ summary: 'Liệt kê quận/huyện theo thành phố' })
  @ApiOkResponse({ type: [DistrictResponseDto] })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thành phố.' })
  @Public()
  @Get('cities/:cityId/districts')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findDistrictsByCityId(
    @Param('cityId', ParseIntPipe) cityId: number,
  ): Promise<DistrictResponseDto[]> {
    return this.locationService.findDistrictsByCityId(cityId);
  }

  // Truy xuất các phường xã thuộc một quận huyện cụ thể để hoàn tất việc chọn địa chỉ.
  @ApiOperation({ summary: 'Liệt kê phường/xã theo quận/huyện' })
  @ApiOkResponse({ type: [WardResponseDto] })
  @ApiNotFoundResponse({ description: 'Không tìm thấy quận/huyện.' })
  @Public()
  @Get('districts/:districtId/wards')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findWardsByDistrictId(
    @Param('districtId', ParseIntPipe) districtId: number,
  ): Promise<WardResponseDto[]> {
    return this.locationService.findWardsByDistrictId(districtId);
  }
}
