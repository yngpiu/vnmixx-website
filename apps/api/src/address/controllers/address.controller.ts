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
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/success-response.util';
import { AddressResponseDto, CreateAddressDto, UpdateAddressDto } from '../dto';
import { AddressService } from '../services/address.service';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@ApiExtraModels(AddressResponseDto)
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả địa chỉ của khách hàng hiện tại' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(AddressResponseDto) },
    }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto[]>> {
    return ok(await this.addressService.findAll(user.id), 'Lấy danh sách địa chỉ thành công.');
  }

  @ApiOperation({ summary: 'Lấy địa chỉ theo ID' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AddressResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto>> {
    return ok(await this.addressService.findById(id, user.id), 'Lấy chi tiết địa chỉ thành công.');
  }

  @ApiOperation({ summary: 'Tạo địa chỉ mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AddressResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Phân cấp địa chỉ không hợp lệ.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async create(
    @Body() dto: CreateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto>> {
    return ok(await this.addressService.create(user.id, dto), 'Tạo địa chỉ thành công.');
  }

  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AddressResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiBadRequestResponse({ description: 'Phân cấp địa chỉ không hợp lệ.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto>> {
    return ok(await this.addressService.update(id, user.id, dto), 'Cập nhật địa chỉ thành công.');
  }

  @ApiOperation({ summary: 'Xóa địa chỉ (xóa mềm)' })
  @ApiOkResponse({
    description: 'Xóa địa chỉ thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa địa chỉ thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<null>> {
    await this.addressService.remove(id, user.id);
    return okNoData('Xóa địa chỉ thành công.');
  }

  @ApiOperation({ summary: 'Đặt địa chỉ làm mặc định' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AddressResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @Patch(':id/set-default')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async setDefault(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto>> {
    return ok(
      await this.addressService.setDefault(id, user.id),
      'Đặt địa chỉ mặc định thành công.',
    );
  }
}
