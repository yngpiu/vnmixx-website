import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ERROR_CODES } from '../../common/constants/error-codes';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  code: string;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Filter dùng để xử lý tất cả các ngoại lệ (exceptions) trong toàn bộ ứng dụng.
 * Đảm bảo mọi lỗi đều được trả về dưới một định dạng chuẩn thống nhất.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  /**
   * Phương thức chính để bắt và xử lý ngoại lệ.
   * Chuyển đổi exception thành response body chuẩn và log lại nếu là lỗi server (500+).
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error, code } = this.extractErrorInfo(exception);

    // Log lỗi nếu là lỗi hệ thống (Internal Server Error)
    if (statusCode >= 500) {
      this.logger.error(
        {
          err:
            exception instanceof Error
              ? { message: exception.message, stack: exception.stack }
              : exception,
          path: request.url,
          method: request.method,
          statusCode,
        },
        'Unhandled Exception',
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      code,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  /**
   * Trích xuất thông tin chi tiết từ exception để phân loại lỗi.
   */
  private extractErrorInfo(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
    code: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      let code = this.mapStatusToCode(status);

      if (typeof response === 'object' && response !== null) {
        const res = response as Record<string, unknown>;
        if (typeof res.code === 'string') {
          code = res.code;
        }
        return {
          statusCode: status,
          message: (res.message as string | string[]) ?? exception.message,
          error: (res.error as string) ?? HttpStatus[status] ?? 'Lỗi',
          code,
        };
      }

      return {
        statusCode: status,
        message: typeof response === 'string' ? response : exception.message,
        error: HttpStatus[status] ?? 'Lỗi',
        code,
      };
    }

    // Mặc định trả về lỗi 500 nếu không xác định được exception
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Lỗi máy chủ nội bộ',
      error: 'Internal Server Error',
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  /**
   * Map HTTP Status code sang mã lỗi ứng dụng (ERROR_CODES).
   */
  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST as number:
        return ERROR_CODES.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED as number:
        return ERROR_CODES.AUTH_UNAUTHORIZED;
      case HttpStatus.FORBIDDEN as number:
        return ERROR_CODES.AUTH_FORBIDDEN;
      case HttpStatus.NOT_FOUND as number:
        return ERROR_CODES.NOT_FOUND;
      case HttpStatus.CONFLICT as number:
        return ERROR_CODES.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS as number:
        return ERROR_CODES.TOO_MANY_REQUESTS;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
