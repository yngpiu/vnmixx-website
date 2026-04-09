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
import { ColorAdminResponseDto, CreateColorDto, UpdateColorDto } from '../dto';
import { ColorService } from '../services/color.service';

@ApiTags('Colors')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/colors')
export class ColorAdminController {
  constructor(private readonly colorService: ColorService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả màu sắc (quản trị)' })
  @ApiOkResponse({ type: [ColorAdminResponseDto] })
  @Get()
  findAll(): Promise<ColorAdminResponseDto[]> {
    return this.colorService.findAll();
  }

  @ApiOperation({ summary: 'Tạo màu mới' })
  @ApiCreatedResponse({ type: ColorAdminResponseDto })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Post()
  create(@Body() dto: CreateColorDto): Promise<ColorAdminResponseDto> {
    return this.colorService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật màu' })
  @ApiOkResponse({ type: ColorAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Tên màu hoặc mã HEX đã được sử dụng.' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColorDto,
  ): Promise<ColorAdminResponseDto> {
    return this.colorService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa màu' })
  @ApiNoContentResponse({ description: 'Xóa màu thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy màu sắc.' })
  @ApiConflictResponse({ description: 'Không thể xóa màu vì đang được sử dụng.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.colorService.remove(id);
  }
}
