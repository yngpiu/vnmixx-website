import {
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
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  BatchDeleteMediaDto,
  CreateFolderDto,
  ListMediaQueryDto,
  MoveMediaDto,
  UploadMediaDto,
} from '../dto';
import { MediaService, type UploadedFileInput } from '../services/media.service';

/** Max file size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Max files per upload: 20 */
const MAX_FILES_COUNT = 20;

@ApiTags('Media')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/media')
export class MediaAdminController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Liệt kê media files (phân trang, tìm kiếm, lọc)' })
  @ApiOkResponse({ description: 'Danh sách media files.' })
  @Get()
  async listMedia(@Query() query: ListMediaQueryDto) {
    return this.mediaService.listMedia(query);
  }

  @ApiOperation({ summary: 'Upload file(s) lên R2' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File(s) tải lên cùng thư mục đích tuỳ chọn.',
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        folder: { type: 'string', description: 'Thư mục đích (tuỳ chọn)' },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_COUNT, {
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @Post('upload')
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const inputs: UploadedFileInput[] = files.map((f) => ({
      originalname: f.originalname,
      mimetype: f.mimetype,
      buffer: f.buffer,
      size: f.size,
    }));
    return this.mediaService.uploadFiles(inputs, dto, user.id);
  }

  @ApiOperation({ summary: 'Liệt kê tất cả thư mục' })
  @ApiOkResponse({ description: 'Danh sách đường dẫn thư mục.', type: [String] })
  @Get('folders')
  async listFolders(): Promise<string[]> {
    return this.mediaService.listFolders();
  }

  @ApiOperation({ summary: 'Tạo thư mục mới (ảo)' })
  @ApiOkResponse({ description: 'Thư mục đã tạo.' })
  @Post('folders')
  async createFolder(@Body() dto: CreateFolderDto) {
    return this.mediaService.createFolder(dto);
  }

  @ApiOperation({ summary: 'Xóa nhiều files cùng lúc' })
  @ApiOkResponse({ description: 'Số files đã xóa.' })
  @Post('batch-delete')
  @HttpCode(HttpStatus.OK)
  async batchDelete(@Body() dto: BatchDeleteMediaDto) {
    return this.mediaService.batchDeleteMedia(dto);
  }

  @ApiOperation({ summary: 'Di chuyển file sang thư mục khác' })
  @ApiOkResponse({ description: 'File đã được di chuyển.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy file.' })
  @Patch(':id/move')
  async moveMedia(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveMediaDto) {
    return this.mediaService.moveMedia(id, dto);
  }

  @ApiOperation({ summary: 'Xóa một file' })
  @ApiNoContentResponse({ description: 'File đã được xóa.' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy file.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMedia(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.mediaService.deleteMedia(id);
  }
}
