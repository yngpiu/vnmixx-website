import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/interfaces';

export interface AuditRequestContext {
  actorEmployeeId?: number;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function buildAuditRequestContext(
  request: Request,
  user: AuthenticatedUser | undefined,
): AuditRequestContext {
  const requestWithId = request as Request & { requestId?: string };
  return {
    actorEmployeeId: user?.userType === 'EMPLOYEE' ? user.id : undefined,
    requestId: requestWithId.requestId,
    ipAddress: extractClientIpAddress(request),
    userAgent: request.headers['user-agent'],
  };
}

function extractClientIpAddress(request: Request): string | undefined {
  const xForwardedFor = request.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0]?.trim();
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return xForwardedFor[0]?.trim();
  }
  return request.ip;
}
