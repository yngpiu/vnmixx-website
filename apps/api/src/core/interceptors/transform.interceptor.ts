import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Interceptor dùng để chuẩn hóa cấu trúc dữ liệu trả về (response body) cho mọi API.
 * Giúp client dễ dàng xử lý dữ liệu với một định dạng thống nhất.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  /**
   * Chặn (intercept) response và bọc dữ liệu trong một đối tượng chuẩn có thuộc tính `success`.
   * Tự động xử lý các trường hợp dữ liệu đơn lẻ hoặc dữ liệu phân trang (có data và meta).
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Nếu dữ liệu đã có cấu trúc chuẩn (chứa success), trả về luôn
        if (data && typeof data === 'object' && 'success' in data) {
          return data as Response<T>;
        }

        // Nếu dữ liệu có dạng phân trang (data + meta), giữ nguyên cấu trúc và thêm success/timestamp
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            ...data,
            timestamp: new Date().toISOString(),
          } as unknown as Response<T>;
        }

        // Mặc định bọc dữ liệu vào trường `data`
        return {
          success: true,
          data: (data ?? null) as T,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
