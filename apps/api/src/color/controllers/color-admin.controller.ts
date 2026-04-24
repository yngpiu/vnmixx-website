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
import type { Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/success-response.util';
import {
  ColorAdminResponseDto,
  ColorListResponseDto,
  CreateColorDto,
  ListColorsQueryDto,
  UpdateColorDto,
} from '../dto';
import { ColorService } from '../services/color.service';

// Quản trị danh mục màu sắc dùng cho việc phân loại và hiển thị sản phẩm.
// Nhân viên có thể thêm/sửa/xóa các mã màu HEX để đảm bảo tính thẩm mỹ trên giao diện.
@ApiTags('Colors')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(ColorListResponseDto, ColorAdminResponseDto)
@Controller('admin/colors')
export class ColorAdminController {
  constructor(private readonly colorService: ColorService) {}

  // Truy xuất danh sách màu sắc phục vụ trang quản trị.
  @ApiOperation({
    summary: 'Liệt kê màu sắc (quản trị)',
    description: 'Phân trang, tìm theo tên hoặc HEX, sắp xếp.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ColorListResponseDto) }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findList(
    @Query() query: ListColorsQueryDto,
  ): Promise<SuccessPayload<ColorListResponseDto>> {
    return ok(
      await this.colorService.findList({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      'Lấy danh sách màu sắc thành công.',
    );
  }

  // Khởi tạo mã màu mới khi nhập các dòng sản phẩm có màu sắc mới.
  @ApiOperation({ summary: 'Tạo màu mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ColorAdminResponseDto) }),
  })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async create(
    @Body() dto: CreateColorDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<Awaited<ReturnType<ColorService['create']>>>> {
    return ok(
      await this.colorService.create(dto, buildAuditRequestContext(request, user)),
      'Tạo màu sắc thành công.',
    );
  }

  // Cập nhật thông tin màu sắc hiện có để đồng bộ với nhận diện thương hiệu.
  @ApiOperation({ summary: 'Cập nhật màu' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(ColorAdminResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColorDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<Awaited<ReturnType<ColorService['update']>>>> {
    return ok(
      await this.colorService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật màu sắc thành công.',
    );
  }

  // Loại bỏ các màu sắc không còn được sử dụng để tối ưu danh mục.
  @ApiOperation({ summary: 'Xóa màu' })
  @ApiOkResponse({
    description: 'Xóa màu sắc thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa màu sắc thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Không thể xóa màu vì đang được sử dụng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.colorService.remove(id, buildAuditRequestContext(request, user));
    return okNoData('Xóa màu sắc thành công.');
  }
}
