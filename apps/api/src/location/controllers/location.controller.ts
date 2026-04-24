import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CityResponseDto, DistrictResponseDto, WardResponseDto } from '../dto';
import { LocationService } from '../services/location.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả tỉnh/thành phố' })
  @ApiOkResponse({ type: [CityResponseDto] })
  @Public()
  @Get('cities')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAllCities(): Promise<CityResponseDto[]> {
    return this.locationService.findAllCities();
  }

  @ApiOperation({ summary: 'Liệt kê quận/huyện theo thành phố' })
  @ApiOkResponse({ type: [DistrictResponseDto] })
  @ApiBadRequestResponse({ description: 'Mã thành phố không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thành phố.' })
  @Public()
  @Get('cities/:cityId/districts')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findDistrictsByCityId(
    @Param('cityId', ParseIntPipe) cityId: number,
  ): Promise<DistrictResponseDto[]> {
    return this.locationService.findDistrictsByCityId(cityId);
  }

  @ApiOperation({ summary: 'Liệt kê phường/xã theo quận/huyện' })
  @ApiOkResponse({ type: [WardResponseDto] })
  @ApiBadRequestResponse({ description: 'Mã quận/huyện không hợp lệ.' })
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
