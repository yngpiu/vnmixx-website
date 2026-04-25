import { Injectable } from '@nestjs/common';

// Service gốc phục vụ endpoint kiểm tra trạng thái.
@Injectable()
export class AppService {
  // Trả về nội dung mặc định cho health check.
  getHello(): string {
    return 'Hello World!';
  }
}
