import { Injectable } from '@nestjs/common';

// Service gốc của ứng dụng.
// Chứa các logic xử lý cơ bản nhất của hệ thống.
@Injectable()
export class AppService {
  // Trả về lời chào mặc định phục vụ mục đích kiểm tra dịch vụ
  getHello(): string {
    return 'Hello World!';
  }
}
