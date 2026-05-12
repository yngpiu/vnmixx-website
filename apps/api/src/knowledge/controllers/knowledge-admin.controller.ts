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
import { CreateKnowledgeDto, KnowledgeResponseDto, UpdateKnowledgeDto } from '../dto';
import { ListKnowledgeQueryDto } from '../dto/list-knowledge-query.dto';
import { KnowledgeService } from '../services/knowledge.service';

@ApiTags('Knowledge Base')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(KnowledgeResponseDto)
@Controller('admin/knowledge')
export class KnowledgeAdminController {
  constructor(private readonly service: KnowledgeService) {}

  @ApiOperation({ summary: 'Lấy danh sách knowledge base' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(KnowledgeResponseDto) },
    }),
  })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get()
  async findAll(
    @Query() query: ListKnowledgeQueryDto,
  ): Promise<SuccessPayload<KnowledgeResponseDto[]>> {
    return ok(
      await this.service.findAll({
        ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      }),
      'Lấy danh sách knowledge base thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy chi tiết knowledge base theo ID' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(KnowledgeResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục kiến thức.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Get(':id')
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<KnowledgeResponseDto>> {
    return ok(await this.service.findById(id), 'Lấy chi tiết knowledge base thành công.');
  }

  @ApiOperation({ summary: 'Tạo mục kiến thức mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(KnowledgeResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Post()
  async create(
    @Body() dto: CreateKnowledgeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<KnowledgeResponseDto>> {
    return ok(
      await this.service.create(dto, buildAuditRequestContext(request, user)),
      'Tạo mục kiến thức thành công.',
    );
  }

  @ApiOperation({ summary: 'Cập nhật mục kiến thức' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(KnowledgeResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục kiến thức.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKnowledgeDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<KnowledgeResponseDto>> {
    return ok(
      await this.service.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật mục kiến thức thành công.',
    );
  }

  @ApiOperation({ summary: 'Xóa mục kiến thức' })
  @ApiNoContentResponse({ description: 'Xóa mục kiến thức thành công.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy mục kiến thức.' })
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.service.deletePermanent(id, buildAuditRequestContext(request, user));
  }
}
