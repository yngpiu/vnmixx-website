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
import { CurrentUser, RequirePermissions, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
} from '../../common/swagger/response-schema.util';
import { ok, okNoData, type SuccessPayload } from '../../common/utils/response.util';
import {
  CreateRoleDto,
  ListRolesQueryDto,
  RoleDetailResponseDto,
  RoleListResponseDto,
  UpdateRoleDto,
} from '../dto';
import { RoleService } from '../services/role.service';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(RoleListResponseDto, RoleDetailResponseDto)
@Controller('admin/roles')
// API quản trị vai trò và quyền trong hệ thống RBAC.
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  // Trả về danh sách vai trò có phân trang và lọc theo query.
  @ApiOperation({
    summary: 'Liệt kê vai trò',
    description: 'Danh sách phân trang; tìm theo tên hoặc mô tả qua tham số search.',
  })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(RoleListResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Tham số truy vấn không hợp lệ.' })
  @RequirePermissions('rbac.read')
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findList(@Query() query: ListRolesQueryDto): Promise<SuccessPayload<RoleListResponseDto>> {
    return ok(
      await this.roleService.findList({
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      }),
      'Lấy danh sách vai trò thành công.',
    );
  }

  // Trả về thông tin chi tiết vai trò theo id.
  @ApiOperation({ summary: 'Lấy chi tiết vai trò kèm quyền' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(RoleDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'ID vai trò không hợp lệ.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @RequirePermissions('rbac.read')
  @Get(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SuccessPayload<RoleDetailResponseDto>> {
    return ok(await this.roleService.findById(id), 'Lấy chi tiết vai trò thành công.');
  }

  // Tạo vai trò mới kèm danh sách quyền ban đầu.
  @ApiOperation({ summary: 'Tạo vai trò mới' })
  @ApiCreatedResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(RoleDetailResponseDto) }),
  })
  @ApiBadRequestResponse({ description: 'Dữ liệu không hợp lệ hoặc ID quyền không tồn tại.' })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.create')
  @Post()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<RoleDetailResponseDto>> {
    return ok(
      await this.roleService.create(dto, buildAuditRequestContext(request, user)),
      'Tạo vai trò thành công.',
    );
  }

  // Cập nhật thông tin vai trò và đồng bộ danh sách quyền.
  @ApiOperation({ summary: 'Cập nhật vai trò và quyền' })
  @ApiOkResponse({
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(RoleDetailResponseDto) }),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiBadRequestResponse({
    description: 'Dữ liệu không hợp lệ, ID quyền không tồn tại, hoặc cố gắng sửa vai trò hệ thống.',
  })
  @ApiConflictResponse({ description: 'Tên vai trò đã được sử dụng.' })
  @RequirePermissions('rbac.update')
  @Put(':id')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<RoleDetailResponseDto>> {
    return ok(
      await this.roleService.update(id, dto, buildAuditRequestContext(request, user)),
      'Cập nhật vai trò thành công.',
    );
  }

  // Xóa vai trò khi thỏa các điều kiện nghiệp vụ.
  @ApiOperation({ summary: 'Xóa vai trò' })
  @ApiOkResponse({
    description: 'Xóa vai trò thành công.',
    schema: buildNullDataSuccessResponseSchema('Xóa vai trò thành công.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy vai trò.' })
  @ApiBadRequestResponse({ description: 'Không được phép xóa vai trò hệ thống.' })
  @RequirePermissions('rbac.delete')
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<null>> {
    await this.roleService.delete(id, buildAuditRequestContext(request, user));
    return okNoData('Xóa vai trò thành công.');
  }
}
