import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ERROR_CODES } from '../../common/constants/error-codes';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  code: string;
  message: string | string[];
}

@Catch()
// Chuẩn hóa mọi exception thành response lỗi thống nhất cho toàn bộ API.
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  // Bắt exception, trích xuất thông tin lỗi và trả response theo format chuẩn.
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, code } = this.extractErrorInfo(exception);

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
    };

    response.status(statusCode).json(body);
  }

  // Trích xuất status/message/error/code từ HttpException hoặc lỗi không xác định.
  private extractErrorInfo(exception: unknown): {
    statusCode: number;
    message: string | string[];
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
          code,
        };
      }

      return {
        statusCode: status,
        message: typeof response === 'string' ? response : exception.message,
        code,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Lỗi máy chủ nội bộ',
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  // Ánh xạ HTTP status sang mã lỗi nội bộ của ứng dụng.
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
      case HttpStatus.BAD_GATEWAY as number:
        return ERROR_CODES.BAD_GATEWAY;
      case HttpStatus.SERVICE_UNAVAILABLE as number:
        return ERROR_CODES.SERVICE_UNAVAILABLE;
      case HttpStatus.GATEWAY_TIMEOUT as number:
        return ERROR_CODES.GATEWAY_TIMEOUT;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }
}
