import { Injectable } from '@nestjs/common';

/**
 * Service gốc của ứng dụng.
 * Chứa các logic xử lý cơ bản nhất của hệ thống.
 */
@Injectable()
export class AppService {
  /**
   * Trả về lời chào mặc định.
   */
  getHello(): string {
    return 'Hello World!';
  }
}
