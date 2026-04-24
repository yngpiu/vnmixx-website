import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: true;
  data: T;
  timestamp: string;
}

@Injectable()
// Chuẩn hóa response thành dạng success/data/timestamp cho toàn bộ API.
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  // Bọc dữ liệu trả về; giữ nguyên nếu response đã theo format chuẩn.
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data as Response<T>;
        }

        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          return {
            success: true,
            ...data,
            timestamp: new Date().toISOString(),
          } as unknown as Response<T>;
        }

        return {
          success: true,
          data: (data ?? null) as T,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
