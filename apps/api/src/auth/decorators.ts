import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from './interfaces';

export const IS_PUBLIC_KEY = 'isPublic';

/** Mark a route as public — skips JWT authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const USER_TYPE_KEY = 'userType';

/**
 * Restrict a route to a specific user type.
 *
 * @example
 * ```ts
 * @RequireUserType('EMPLOYEE')
 * @Get('dashboard')
 * dashboard() { ... }
 * ```
 */
export const RequireUserType = (type: 'CUSTOMER' | 'EMPLOYEE') => SetMetadata(USER_TYPE_KEY, type);

export const PERMISSIONS_KEY = 'permissions';

/**
 * Specify which permissions are required for the route.
 *
 * @example
 * ```ts
 * @RequirePermissions('product.create', 'product.update')
 * @Post()
 * create() { ... }
 * ```
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * @example
 * ```ts
 * @Get('me')
 * getProfile(@CurrentUser() user: AuthenticatedUser) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser;
  },
);
