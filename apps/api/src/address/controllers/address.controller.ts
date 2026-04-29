import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
  ApiNoContentResponse,
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
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { AddressResponseDto, CreateAddressDto, UpdateAddressDto } from '../dto';
import { AddressService } from '../services/address.service';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@ApiExtraModels(AddressResponseDto)
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@Controller('me/addresses')
// API quản lý sổ địa chỉ cá nhân của khách hàng.
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  // Lấy toàn bộ danh sách địa chỉ đã lưu của khách hàng hiện tại.
  @ApiOperation({ summary: 'Lấy danh sách địa chỉ của khách hàng hiện tại' })
  @ApiOkResponse({
    description: 'Lấy danh sách địa chỉ thành công.',
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(AddressResponseDto) },
    }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto[]>> {
    return ok(await this.addressService.findAll(user.id), 'Lấy danh sách địa chỉ thành công.');
  }

  // Lấy thông tin chi tiết của một địa chỉ cụ thể theo ID.
  @ApiOperation({ summary: 'Lấy địa chỉ theo ID' })
  @ApiOkResponse({
    description: 'Lấy chi tiết địa chỉ thành công.',
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AddressResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto>> {
    return ok(await this.addressService.findById(id, user.id), 'Lấy chi tiết địa chỉ thành công.');
  }

  // Thêm một địa chỉ mới vào sổ địa chỉ của khách hàng.
  @ApiOperation({ summary: 'Tạo địa chỉ mới' })
  @ApiCreatedResponse({
    description: 'Tạo địa chỉ thành công.',
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AddressResponseDto) }),
  })
  @ApiBadRequestResponse({
    description: 'Thông tin đầu vào không hợp lệ hoặc phân cấp địa chỉ sai.',
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post()
  async create(
    @Body() dto: CreateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto>> {
    return ok(await this.addressService.create(user.id, dto), 'Tạo địa chỉ thành công.');
  }

  // Cập nhật các thông tin của một địa chỉ hiện có.
  @ApiOperation({ summary: 'Cập nhật địa chỉ' })
  @ApiOkResponse({
    description: 'Cập nhật địa chỉ thành công.',
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(AddressResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiBadRequestResponse({
    description: 'Thông tin đầu vào không hợp lệ hoặc phân cấp địa chỉ sai.',
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SuccessPayload<AddressResponseDto>> {
    return ok(await this.addressService.update(id, user.id, dto), 'Cập nhật địa chỉ thành công.');
  }

  // Xóa bỏ một địa chỉ khỏi sổ địa chỉ.
  @ApiOperation({ summary: 'Xóa địa chỉ (xóa cứng)' })
  @ApiNoContentResponse({
    description: 'Xóa địa chỉ thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy địa chỉ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.addressService.remove(id, user.id);
  }
}
