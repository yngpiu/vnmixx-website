import { Controller, Get } from '@nestjs/common';
import { ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators';
import { ok, type SuccessPayload } from './common/utils/response.util';

// Endpoint gốc để kiểm tra trạng thái API.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Trả về phản hồi health check mặc định.
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  getHello(): SuccessPayload<string> {
    return ok(this.appService.getHello(), 'Kiểm tra trạng thái API thành công.');
  }
}
