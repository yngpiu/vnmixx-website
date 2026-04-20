import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, USER_TYPE_KEY } from './decorators';
import type { AuthenticatedUser } from './interfaces';

/**
 * Guard bảo mật JWT toàn cục.
 * Mọi route đều yêu cầu một mã truy cập hợp lệ trừ khi được đánh dấu bằng `@Public()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  /**
   * Kiểm tra xem route hiện tại có được phép truy cập công khai hay không.
   * Nếu có `@Public()`, bỏ qua xác thực JWT. Ngược lại, thực hiện logic xác thực của AuthGuard('jwt').
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

/**
 * Guard phân quyền (Authorization).
 * Kiểm tra loại người dùng (Customer/Employee) và các quyền hạn (Permissions) dựa trên decorator.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Thực thi logic phân quyền:
   * 1. Kiểm tra loại người dùng được yêu cầu qua `@RequireUserType()`.
   * 2. Kiểm tra danh sách quyền hạn được yêu cầu qua `@RequirePermissions()`.
   * 3. Đảm bảo người dùng trong request đáp ứng đủ các tiêu chí này.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    // Logic kiểm tra loại người dùng (CUSTOMER hoặc EMPLOYEE)
    const requiredUserType = this.reflector.getAllAndOverride<'CUSTOMER' | 'EMPLOYEE'>(
      USER_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredUserType) {
      if (!user || user.userType !== requiredUserType) {
        throw new ForbiddenException(
          `Tài nguyên này chỉ cho phép ${requiredUserType.toLowerCase()} truy cập`,
        );
      }
    }

    // Logic kiểm tra quyền hạn (Permissions) dựa trên RBAC
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredPermissions?.length) {
      if (!user) throw new ForbiddenException('Yêu cầu xác thực');
      const hasAll = requiredPermissions.every((p) => user.permissions.includes(p));
      if (!hasAll) throw new ForbiddenException('Không đủ quyền truy cập');
    }

    return true;
  }
}
