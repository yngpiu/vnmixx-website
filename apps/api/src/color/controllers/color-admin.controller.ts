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
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  ColorAdminResponseDto,
  ColorListResponseDto,
  CreateColorDto,
  ListColorsQueryDto,
  UpdateColorDto,
} from '../dto';
import { ColorService } from '../services/color.service';

/**
 * ColorAdminController: Endpoint quản trị màu sắc.
 * Vai trò: Cho phép nhân viên quản lý (CRUD) danh mục màu sắc của hệ thống.
 */
@ApiTags('Colors')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/colors')
export class ColorAdminController {
  constructor(private readonly colorService: ColorService) {}

  /**
   * Lấy danh sách màu sắc có phân trang và tìm kiếm.
   */
  @ApiOperation({
    summary: 'Liệt kê màu sắc (quản trị)',
    description: 'Phân trang, tìm theo tên hoặc HEX, sắp xếp.',
  })
  @ApiOkResponse({ type: ColorListResponseDto })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  findList(@Query() query: ListColorsQueryDto): Promise<ColorListResponseDto> {
    return this.colorService.findList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  /**
   * Tạo màu sắc mới.
   */
  @ApiOperation({ summary: 'Tạo màu mới' })
  @ApiCreatedResponse({ type: ColorAdminResponseDto })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  create(
    @Body() dto: CreateColorDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<ColorAdminResponseDto> {
    return this.colorService.create(dto, buildAuditRequestContext(request, user));
  }

  /**
   * Cập nhật thông tin màu sắc.
   */
  @ApiOperation({ summary: 'Cập nhật màu' })
  @ApiOkResponse({ type: ColorAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColorDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<ColorAdminResponseDto> {
    return this.colorService.update(id, dto, buildAuditRequestContext(request, user));
  }

  /**
   * Xóa màu sắc khỏi hệ thống.
   */
  @ApiOperation({ summary: 'Xóa màu' })
  @ApiNoContentResponse({ description: 'Xóa màu thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Không thể xóa màu vì đang được sử dụng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.colorService.remove(id, buildAuditRequestContext(request, user));
  }
}
