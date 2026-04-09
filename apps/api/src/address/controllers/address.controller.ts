import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { AddressResponseDto, CreateAddressDto, UpdateAddressDto } from '../dto';
import { AddressService } from '../services/address.service';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả địa chỉ của khách hàng hiện tại' })
  @ApiOkResponse({ type: [AddressResponseDto] })
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<AddressResponseDto[]> {
    return this.addressService.findAll(user.id);
  }

  @ApiOperation({ summary: 'Lấy địa chỉ theo ID' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'Tạo địa chỉ mới' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  @ApiBadRequestResponse({ description: 'Phân cấp địa chỉ không hợp lệ.' })
  @Post()
  async create(
    @Body() dto: CreateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.create(user.id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiBadRequestResponse({ description: 'Phân cấp địa chỉ không hợp lệ.' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Xóa địa chỉ (xóa mềm)' })
  @ApiNoContentResponse({ description: 'Xóa địa chỉ thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.addressService.remove(id, user.id);
  }

  @ApiOperation({ summary: 'Đặt địa chỉ làm mặc định' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @Patch(':id/set-default')
  async setDefault(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.setDefault(id, user.id);
  }
}
