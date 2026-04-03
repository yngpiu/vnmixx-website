import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY, USER_TYPE_KEY } from './decorators';
import type { AuthenticatedUser } from './interfaces';

/**
 * Global JWT auth guard.
 * Every route requires a valid access token unless decorated with `@Public()`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

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
 * Checks user type and permissions based on `@RequireUserType()` and `@RequirePermissions()`.
 * Combine both checks in one guard to avoid stacking multiple guards on routes.
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    const requiredUserType = this.reflector.getAllAndOverride<'CUSTOMER' | 'EMPLOYEE'>(
      USER_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (requiredUserType) {
      if (!user || user.userType !== requiredUserType) {
        throw new ForbiddenException(
          `This resource is only accessible to ${requiredUserType.toLowerCase()}s`,
        );
      }
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredPermissions?.length) {
      if (!user) throw new ForbiddenException('Authentication required');
      const hasAll = requiredPermissions.every((p) => user.permissions.includes(p));
      if (!hasAll) throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
