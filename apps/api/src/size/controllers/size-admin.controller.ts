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
import { RequireUserType } from '../../auth/decorators';
import {
  CreateSizeDto,
  ListSizesQueryDto,
  SizeAdminResponseDto,
  SizeListResponseDto,
  UpdateSizeDto,
} from '../dto';
import { SizeService } from '../services/size.service';

@ApiTags('Sizes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/sizes')
export class SizeAdminController {
  constructor(private readonly sizeService: SizeService) {}

  @ApiOperation({
    summary: 'Liệt kê kích thước (quản trị)',
    description: 'Phân trang, tìm theo nhãn, sắp xếp.',
  })
  @ApiOkResponse({ type: SizeListResponseDto })
  @Get()
  findList(@Query() query: ListSizesQueryDto): Promise<SizeListResponseDto> {
    return this.sizeService.findList({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @ApiOperation({ summary: 'Tạo kích thước mới' })
  @ApiCreatedResponse({ type: SizeAdminResponseDto })
  @ApiConflictResponse({ description: 'Nhãn kích thước đã được sử dụng.' })
  @Post()
  create(@Body() dto: CreateSizeDto): Promise<SizeAdminResponseDto> {
    return this.sizeService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật kích thước' })
  @ApiOkResponse({ type: SizeAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy kích thước.' })
  @ApiConflictResponse({ description: 'Nhãn kích thước đã được sử dụng.' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSizeDto,
  ): Promise<SizeAdminResponseDto> {
    return this.sizeService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa kích thước' })
  @ApiNoContentResponse({ description: 'Xóa kích thước thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy kích thước.' })
  @ApiConflictResponse({ description: 'Không thể xóa kích thước vì đang được sử dụng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.sizeService.remove(id);
  }
}
