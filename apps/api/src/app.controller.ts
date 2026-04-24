import { Controller, Get } from '@nestjs/common';
import { ApiInternalServerErrorResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators';
import { ok, type SuccessPayload } from './common/utils/response.util';

// Controller gốc của ứng dụng.
// Cung cấp các endpoint cơ bản để kiểm tra trạng thái hoạt động của API.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Endpoint mặc định trả về lời chào "Hello World!".
  // Được đánh dấu @Public để có thể truy cập công khai mà không cần xác thực (Health Check).
  @Public()
  @Get()
  @ApiInternalServerErrorResponse({ description: 'Lỗi hệ thống.' })
  getHello(): SuccessPayload<string> {
    return ok(this.appService.getHello(), 'Kiểm tra trạng thái API thành công.');
  }
}
