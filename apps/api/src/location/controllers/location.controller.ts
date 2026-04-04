import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { CityResponseDto, DistrictResponseDto, WardResponseDto } from '../dto';
import { LocationService } from '../services/location.service';

@ApiTags('Locations')
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @ApiOperation({ summary: 'List all cities/provinces' })
  @ApiOkResponse({ type: [CityResponseDto] })
  @Public()
  @Get('cities')
  async findAllCities(): Promise<CityResponseDto[]> {
    return this.locationService.findAllCities();
  }

  @ApiOperation({ summary: 'List districts by city' })
  @ApiOkResponse({ type: [DistrictResponseDto] })
  @ApiNotFoundResponse({ description: 'City not found' })
  @Public()
  @Get('cities/:cityId/districts')
  async findDistrictsByCityId(
    @Param('cityId', ParseIntPipe) cityId: number,
  ): Promise<DistrictResponseDto[]> {
    return this.locationService.findDistrictsByCityId(cityId);
  }

  @ApiOperation({ summary: 'List wards by district' })
  @ApiOkResponse({ type: [WardResponseDto] })
  @ApiNotFoundResponse({ description: 'District not found' })
  @Public()
  @Get('districts/:districtId/wards')
  async findWardsByDistrictId(
    @Param('districtId', ParseIntPipe) districtId: number,
  ): Promise<WardResponseDto[]> {
    return this.locationService.findWardsByDistrictId(districtId);
  }
}
