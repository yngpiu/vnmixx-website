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
import {
  AttributeResponseDto,
  AttributeValueAdminResponseDto,
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from '../dto';
import { AttributeService } from '../services/attribute.service';

@ApiTags('Attributes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/attributes')
export class AttributeAdminController {
  constructor(private readonly attributeService: AttributeService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả thuộc tính kèm giá trị' })
  @ApiOkResponse({ type: [AttributeResponseDto] })
  @Get()
  findAll(): Promise<AttributeResponseDto[]> {
    return this.attributeService.findAll();
  }

  @ApiOperation({ summary: 'Tạo thuộc tính mới' })
  @ApiCreatedResponse({ type: AttributeResponseDto })
  @ApiConflictResponse({ description: 'Tên thuộc tính đã được sử dụng.' })
  @Post()
  create(@Body() dto: CreateAttributeDto): Promise<AttributeResponseDto> {
    return this.attributeService.create(dto);
  }

  @ApiOperation({ summary: 'Cập nhật thuộc tính' })
  @ApiOkResponse({ type: AttributeResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thuộc tính.' })
  @ApiConflictResponse({ description: 'Tên thuộc tính đã được sử dụng.' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDto,
  ): Promise<AttributeResponseDto> {
    return this.attributeService.update(id, dto);
  }

  @ApiOperation({ summary: 'Xóa thuộc tính (kéo theo các giá trị)' })
  @ApiNoContentResponse({ description: 'Xóa thuộc tính thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thuộc tính.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.attributeService.remove(id);
  }

  // ─── Attribute Values ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Thêm giá trị cho thuộc tính' })
  @ApiCreatedResponse({ type: AttributeValueAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thuộc tính.' })
  @ApiConflictResponse({ description: 'Giá trị thuộc tính đã tồn tại.' })
  @Post(':id/values')
  createValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttributeValueDto,
  ): Promise<AttributeValueAdminResponseDto> {
    return this.attributeService.createValue(id, dto);
  }

  @ApiOperation({ summary: 'Cập nhật giá trị thuộc tính' })
  @ApiOkResponse({ type: AttributeValueAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thuộc tính hoặc giá trị.' })
  @ApiConflictResponse({ description: 'Giá trị thuộc tính đã tồn tại.' })
  @Put(':id/values/:valueId')
  updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number,
    @Body() dto: UpdateAttributeValueDto,
  ): Promise<AttributeValueAdminResponseDto> {
    return this.attributeService.updateValue(id, valueId, dto);
  }

  @ApiOperation({ summary: 'Xóa giá trị thuộc tính' })
  @ApiNoContentResponse({ description: 'Xóa giá trị thuộc tính thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy thuộc tính hoặc giá trị.' })
  @Delete(':id/values/:valueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number,
  ): Promise<void> {
    return this.attributeService.removeValue(id, valueId);
  }
}
