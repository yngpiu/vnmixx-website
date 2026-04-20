import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationGuard, JwtAuthGuard } from './guards';
import { AuthenticatedUser } from './interfaces';

const mockBaseCanActivate = jest.fn();
jest.mock('@nestjs/passport', () => ({
  AuthGuard: () =>
    class {
      canActivate(context: ExecutionContext) {
        return mockBaseCanActivate(context);
      }
    },
}));

describe('Guards', () => {
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    reflector = module.get(Reflector);
  });

  describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;

    beforeEach(() => {
      guard = new JwtAuthGuard(reflector);
    });

    it('should return true if route is decorated with @Public()', async () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(true);
      mockBaseCanActivate.mockReset();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
      expect(mockBaseCanActivate).not.toHaveBeenCalled();
    });

    it('should delegate to base auth guard if route is not public', async () => {
      const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
      } as unknown as ExecutionContext;

      reflector.getAllAndOverride.mockReturnValue(false);
      mockBaseCanActivate.mockReset();
      mockBaseCanActivate.mockReturnValue(true);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockBaseCanActivate).toHaveBeenCalledWith(context);
    });
  });

  describe('AuthorizationGuard', () => {
    let guard: AuthorizationGuard;

    beforeEach(() => {
      guard = new AuthorizationGuard(reflector);
    });

    const mockContext = (user: Partial<AuthenticatedUser> | undefined) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      }) as unknown as ExecutionContext;

    it('should allow access if no userType or permissions required', () => {
      reflector.getAllAndOverride.mockReturnValue(null);
      const context = mockContext({ id: 1 });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if userType mismatch', () => {
      reflector.getAllAndOverride.mockReturnValueOnce('EMPLOYEE').mockReturnValue(null);
      const context = mockContext({ userType: 'CUSTOMER' });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access if userType matches', () => {
      reflector.getAllAndOverride.mockReturnValueOnce('CUSTOMER').mockReturnValue(null);
      const context = mockContext({ userType: 'CUSTOMER' });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if missing permissions', () => {
      reflector.getAllAndOverride.mockReturnValueOnce(null).mockReturnValue(['order.read']);
      const context = mockContext({ userType: 'EMPLOYEE', permissions: [] });

      expect(() => guard.canActivate(context)).toThrow('Không đủ quyền truy cập');
    });

    it('should allow access if user has all required permissions', () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(null)
        .mockReturnValue(['order.read', 'order.write']);
      const context = mockContext({
        userType: 'EMPLOYEE',
        permissions: ['order.read', 'order.write', 'other'],
      });

      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
