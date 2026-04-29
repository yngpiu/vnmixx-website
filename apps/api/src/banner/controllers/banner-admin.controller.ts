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
  BannerAdminResponseDto,
  CreateBannerDto,
  ListBannersQueryDto,
  UpdateBannerDto,
} from '../dto';
import { BannerService } from '../services/banner.service';

@ApiTags('Banners')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(BannerAdminResponseDto)
@Controller('admin/banners')
export class BannerAdminController {
  constructor(private readonly bannerService: BannerService) {}

  @ApiOperation({
    summary: 'Lấy danh sách banner',
    description:
      '`isActive` / `isSoftDeleted`: không gửi = không lọc; gửi true/false để lọc (cùng quy ước danh sách admin khác).',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(BannerAdminResponseDto) },
    }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findAll(
    @Query() query: ListBannersQueryDto,
  ): Promise<SuccessPayload<BannerAdminResponseDto[]>> {
    return ok(
      await this.bannerService.findAll({
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      }),
      'Lấy danh sách banner thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy chi tiết banner theo ID' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(BannerAdminResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy banner.' })
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<BannerAdminResponseDto>> {
    return ok(await this.bannerService.findById(id), 'Lấy chi tiết banner thành công.');
  }

  @ApiOperation({ summary: 'Tạo banner mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(BannerAdminResponseDto) }),
  })
  @ApiConflictResponse({ description: 'Danh mục đã được liên kết với banner khác.' })
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async create(
    @Body() dto: CreateBannerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<BannerAdminResponseDto>> {
    return ok(
      await this.bannerService.create(dto, buildAuditRequestContext(request, user)),
      'Tạo banner thành công.',
    );
  }

  @ApiOperation({ summary: 'Cập nhật banner' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(BannerAdminResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy banner.' })
  @ApiConflictResponse({ description: 'Danh mục đã được liên kết với banner khác.' })
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<BannerAdminResponseDto>> {
    return ok(
      await this.bannerService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật banner thành công.',
    );
  }

  @ApiOperation({ summary: 'Xóa banner' })
  @ApiNoContentResponse({
    description: 'Xóa banner thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy banner.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.bannerService.deletePermanent(id, buildAuditRequestContext(request, user));
  }
}
