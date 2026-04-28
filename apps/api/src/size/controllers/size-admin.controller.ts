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
  ApiNoContentResponse,
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
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  CreateSizeDto,
  ListSizesQueryDto,
  SizeAdminResponseDto,
  SizeListResponseDto,
  UpdateSizeDto,
} from '../dto';
import { SizeService } from '../services/size.service';

// Quản trị hệ thống kích thước dùng chung cho toàn bộ sản phẩm.
// Cho phép nhân viên cập nhật danh mục kích thước để đảm bảo tính nhất quán của dữ liệu sản phẩm.
@ApiTags('Sizes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(SizeListResponseDto, SizeAdminResponseDto)
@Controller('admin/sizes')
export class SizeAdminController {
  constructor(private readonly sizeService: SizeService) {}

  // Truy xuất danh sách kích thước phục vụ công tác quản lý của admin.
  @ApiOperation({
    summary: 'Lấy danh sách kích thước',
    description: 'Phân trang, tìm theo nhãn, sắp xếp.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(SizeListResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findList(@Query() query: ListSizesQueryDto): Promise<SuccessPayload<SizeListResponseDto>> {
    return ok(
      await this.sizeService.findList({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      'Lấy danh sách kích thước thành công.',
    );
  }

  // Khởi tạo các loại kích thước mới để áp dụng cho các dòng sản phẩm mới.
  @ApiOperation({ summary: 'Tạo kích thước mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(SizeAdminResponseDto) }),
  })
  @ApiConflictResponse({ description: 'Nhãn kích thước đã được sử dụng.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async create(
    @Body() dto: CreateSizeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<Awaited<ReturnType<SizeService['create']>>>> {
    return ok(
      await this.sizeService.create(dto, buildAuditRequestContext(request, user)),
      'Tạo kích thước thành công.',
    );
  }

  // Chỉnh sửa thông tin kích thước khi có sai sót hoặc thay đổi quy chuẩn.
  @ApiOperation({ summary: 'Cập nhật kích thước' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(SizeAdminResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy kích thước.' })
  @ApiConflictResponse({ description: 'Nhãn kích thước đã được sử dụng.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSizeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<Awaited<ReturnType<SizeService['update']>>>> {
    return ok(
      await this.sizeService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật kích thước thành công.',
    );
  }

  // Loại bỏ các kích thước không còn sử dụng để làm gọn danh mục.
  @ApiOperation({ summary: 'Xóa kích thước' })
  @ApiNoContentResponse({
    description: 'Xóa kích thước thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy kích thước.' })
  @ApiConflictResponse({ description: 'Không thể xóa kích thước vì đang được sử dụng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.sizeService.remove(id, buildAuditRequestContext(request, user));
  }
}
