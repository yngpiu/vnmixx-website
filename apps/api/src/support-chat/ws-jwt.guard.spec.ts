import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { EmployeeAuthzCacheService } from '../auth/services/employee-authz-cache.service';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  const createContext = (client: Record<string, any>): ExecutionContext =>
    ({
      switchToWs: () => ({
        getClient: () => client,
      }),
    }) as ExecutionContext;

  it('should authenticate using handshake auth token', async () => {
    const jwtService = {
      verify: jest.fn(() => ({ sub: 123, userType: 'CUSTOMER' })),
    } as unknown as JwtService;
    const authz = {
      getRolesAndPermissions: jest.fn(),
    } as unknown as EmployeeAuthzCacheService;
    const guard = new WsJwtGuard(jwtService, authz);
    const client = { handshake: { auth: { token: 'token-1' }, headers: {} }, data: {} };
    const result = await guard.canActivate(createContext(client));
    expect(result).toBe(true);
    expect(client.data).toEqual({ userId: 123, userType: 'CUSTOMER' });
  });

  it('should authenticate using bearer token in headers', async () => {
    const jwtService = {
      verify: jest.fn(() => ({ sub: 456, userType: 'EMPLOYEE' })),
    } as unknown as JwtService;
    const authz = {
      getRolesAndPermissions: jest.fn().mockResolvedValue({ roles: [], permissions: ['x.read'] }),
    } as unknown as EmployeeAuthzCacheService;
    const guard = new WsJwtGuard(jwtService, authz);
    const client = {
      handshake: { auth: {}, headers: { authorization: 'Bearer token-2' } },
      data: { room: 'support' },
    };
    const result = await guard.canActivate(createContext(client));
    expect(result).toBe(true);
    expect(client.data).toEqual({
      room: 'support',
      userId: 456,
      userType: 'EMPLOYEE',
      permissions: ['x.read'],
    });
  });

  it('should throw when token is missing', async () => {
    const jwtService = { verify: jest.fn() } as unknown as JwtService;
    const authz = {
      getRolesAndPermissions: jest.fn(),
    } as unknown as EmployeeAuthzCacheService;
    const guard = new WsJwtGuard(jwtService, authz);
    const client = { handshake: { auth: {}, headers: {} }, data: {} };
    await expect(guard.canActivate(createContext(client))).rejects.toThrow(WsException);
  });

  it('should throw when payload is invalid', async () => {
    const jwtService = {
      verify: jest.fn(() => ({ sub: undefined, userType: 'CUSTOMER' })),
    } as unknown as JwtService;
    const authz = {
      getRolesAndPermissions: jest.fn(),
    } as unknown as EmployeeAuthzCacheService;
    const guard = new WsJwtGuard(jwtService, authz);
    const client = { handshake: { auth: { token: 'bad' }, headers: {} }, data: {} };
    await expect(guard.canActivate(createContext(client))).rejects.toThrow(WsException);
  });

  it('should throw when verify throws', async () => {
    const jwtService = {
      verify: jest.fn(() => {
        throw new Error('expired');
      }),
    } as unknown as JwtService;
    const authz = {
      getRolesAndPermissions: jest.fn(),
    } as unknown as EmployeeAuthzCacheService;
    const guard = new WsJwtGuard(jwtService, authz);
    const client = { handshake: { auth: { token: 'expired' }, headers: {} }, data: {} };
    await expect(guard.canActivate(createContext(client))).rejects.toThrow(WsException);
  });
});
