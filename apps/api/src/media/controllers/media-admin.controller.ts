import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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
  buildNullDataSuccessResponseSchema,
  buildSuccessResponseSchema,
  ok,
  okNoData,
  type SuccessPayload,
} from '../../common/utils/response.util';
import {
  CreateFolderDto,
  ListMediaQueryDto,
  MediaListResponseDto,
  MediaResponseDto,
  MoveMediaDto,
  UploadMediaDto,
} from '../dto';
import { MediaService, type UploadedFileInput } from '../services/media.service';

// Giới hạn kích thước tệp tải lên tối đa: 50 MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;
// Số lượng tệp tối đa trong một lần upload: 20
const MAX_FILES_COUNT = 20;
const ALLOWED_MIME_PREFIXES = ['image/', 'video/'] as const;

function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
}

@ApiTags('Media')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@ApiExtraModels(MediaResponseDto, MediaListResponseDto)
@Controller('admin/media')
// Controller cung cấp các endpoint quản trị media dành cho nhân viên/admin
// Bao gồm các thao tác: liệt kê, upload, tạo thư mục, di chuyển và xóa file/thư mục
export class MediaAdminController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Lấy danh sách tệp media' })
  @ApiOkResponse({
    description: 'Danh sách tệp media.',
    schema: buildSuccessResponseSchema({ $ref: getSchemaPath(MediaListResponseDto) }),
  })
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async listMedia(
    @Query() query: ListMediaQueryDto,
  ): Promise<SuccessPayload<MediaListResponseDto>> {
    return ok(await this.mediaService.listMedia(query), 'Lấy danh sách media thành công.');
  }

  @ApiOperation({ summary: 'Tải tệp media lên R2' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File(s) tải lên cùng thư mục đích tuỳ chọn.',
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        folder: { type: 'string', description: 'Thư mục đích (tuỳ chọn)' },
        customerId: {
          type: 'number',
          description: 'ID khách hàng (tuỳ chọn), hệ thống sẽ lưu theo <customerId>/image',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Danh sách tệp đã tải lên.',
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(MediaResponseDto) },
    }),
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_COUNT, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_, file, callback) => {
        callback(null, isAllowedMimeType(file.mimetype));
      },
    }),
  )
  @Post('upload')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  // Endpoint tiếp nhận file từ request multipart/form-data và chuyển tiếp sang MediaService
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<MediaResponseDto[]>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Chỉ hỗ trợ upload ảnh hoặc video.');
    }
    const inputs: UploadedFileInput[] = files.map((f) => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      buffer: f.buffer,
      size: f.size,
    }));
    return ok(
      await this.mediaService.uploadFiles(
        inputs,
        dto,
        user.id,
        buildAuditRequestContext(request, user),
      ),
      'Tải tệp lên thành công.',
    );
  }

  @ApiOperation({ summary: 'Lấy danh sách thư mục media' })
  @ApiOkResponse({
    description: 'Danh sách đường dẫn thư mục.',
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { type: 'string', example: 'products/shoes' },
    }),
  })
  @Get('folders')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  async listFolders(): Promise<SuccessPayload<string[]>> {
    return ok(await this.mediaService.listFolders(), 'Lấy danh sách thư mục thành công.');
  }

  @ApiOperation({ summary: 'Tạo thư mục media' })
  @ApiOkResponse({
    description: 'Thư mục đã tạo.',
    schema: buildNullDataSuccessResponseSchema('Thư mục đã tạo.'),
  })
  @Post('folders')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  // Tạo thư mục logic trong hệ thống để tổ chức lưu trữ media
  async createFolder(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<never>> {
    await this.mediaService.createFolder(dto, buildAuditRequestContext(request, user));
    return okNoData('Tạo thư mục thành công.');
  }

  @ApiOperation({ summary: 'Xóa thư mục và toàn bộ nội dung bên trong' })
  @ApiNoContentResponse({
    description: 'Kết quả xóa thư mục.',
  })
  @Delete('folders')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  // Xóa thư mục sẽ xóa toàn bộ file bên trong trên R2 và DB
  async deleteFolder(
    @Query('path') path: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.mediaService.deleteFolder(path, buildAuditRequestContext(request, user));
  }

  @ApiOperation({ summary: 'Di chuyển tệp media sang thư mục khác' })
  @ApiOkResponse({
    description: 'File đã được di chuyển.',
    schema: buildNullDataSuccessResponseSchema('File đã được di chuyển.'),
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy file.' })
  @Patch(':id/move')
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  // Cập nhật thư mục cha của một file media
  async moveMedia(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveMediaDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<never>> {
    await this.mediaService.moveMedia(id, dto, buildAuditRequestContext(request, user));
    return okNoData('Di chuyển file thành công.');
  }

  @ApiOperation({ summary: 'Xóa tệp media' })
  @ApiNoContentResponse({
    description: 'Xóa file thành công.',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy file.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  // Xóa một file media đơn lẻ
  async deleteMedia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.mediaService.deleteMedia(id, buildAuditRequestContext(request, user));
  }
}
