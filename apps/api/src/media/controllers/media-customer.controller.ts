import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Express, Request } from 'express';
import { buildAuditRequestContext } from '../../audit-log/audit-log-request.util';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import {
  buildSuccessResponseSchema,
  ok,
  type SuccessPayload,
} from '../../common/utils/response.util';
import { MediaResponseDto, UploadMediaDto } from '../dto';
import { MediaService, type UploadedFileInput } from '../services/media.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES_COUNT = 1;
const ALLOWED_MIME_PREFIX = 'image/';

function isAllowedImageFile(file: Express.Multer.File): boolean {
  return file.mimetype.startsWith(ALLOWED_MIME_PREFIX);
}

@ApiTags('Media')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Yêu cầu xác thực hoặc token không hợp lệ.' })
@ApiForbiddenResponse({ description: 'Bạn không có quyền truy cập tài nguyên này.' })
@RequireUserType('CUSTOMER')
@ApiExtraModels(MediaResponseDto)
@Controller('me/media')
export class MediaCustomerController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Tải ảnh đại diện khách hàng' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Tải lên 1 ảnh đại diện.',
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiOkResponse({
    description: 'Tải ảnh thành công.',
    schema: buildSuccessResponseSchema({
      type: 'array',
      items: { $ref: getSchemaPath(MediaResponseDto) },
    }),
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES_COUNT, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (
        _,
        file: Express.Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        callback(null, isAllowedImageFile(file));
      },
    }),
  )
  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  @ApiBadRequestResponse({ description: 'Dữ liệu đầu vào không hợp lệ.' })
  async uploadAvatar(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadMediaDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ): Promise<SuccessPayload<MediaResponseDto[]>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ảnh để tải lên.');
    }
    const inputs: UploadedFileInput[] = files.map((file) => ({
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    }));
    return ok(
      await this.mediaService.uploadFiles(
        inputs,
        { ...dto, customerId: user.id },
        undefined,
        buildAuditRequestContext(request, user),
      ),
      'Tải ảnh đại diện thành công.',
    );
  }
}
