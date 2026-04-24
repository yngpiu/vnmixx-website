import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  success: true;
  data?: T;
  message: string;
  meta?: Record<string, unknown>;
}

@Injectable()
// Chuẩn hóa response thành dạng success/data/message/meta cho toàn bộ API.
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  // Bọc dữ liệu trả về; giữ nguyên nếu response đã theo format chuẩn.
  intercept(_context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (
          data &&
          typeof data === 'object' &&
          ('data' in data || 'message' in data || 'meta' in data)
        ) {
          const envelope = data as Record<string, unknown>;
          return {
            success: true,
            ...('data' in envelope ? { data: envelope.data as T } : {}),
            message: (envelope.message as string) ?? 'Success',
            ...(envelope.meta && typeof envelope.meta === 'object'
              ? { meta: envelope.meta as Record<string, unknown> }
              : {}),
          };
        }

        return {
          success: true,
          data: (data ?? null) as T,
          message: 'Success',
        };
      }),
    );
  }
}
