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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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

@ApiTags('Colors')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/colors')
export class ColorAdminController {
  constructor(private readonly colorService: ColorService) {}

  @ApiOperation({
    summary: 'Liệt kê màu sắc (quản trị)',
    description: 'Phân trang, tìm theo tên hoặc HEX, sắp xếp.',
  })
  @ApiOkResponse({ type: ColorListResponseDto })
  @Get()
  findList(@Query() query: ListColorsQueryDto): Promise<ColorListResponseDto> {
    return this.colorService.findList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @ApiOperation({ summary: 'Tạo màu mới' })
  @ApiCreatedResponse({ type: ColorAdminResponseDto })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Post()
  create(
    @Body() dto: CreateColorDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<ColorAdminResponseDto> {
    return this.colorService.create(dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Cập nhật màu' })
  @ApiOkResponse({ type: ColorAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColorDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<ColorAdminResponseDto> {
    return this.colorService.update(id, dto, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Xóa màu' })
  @ApiNoContentResponse({ description: 'Xóa màu thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Không thể xóa màu vì đang được sử dụng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    return this.colorService.remove(id, buildAuditRequestContext(request, user));
  }
}
