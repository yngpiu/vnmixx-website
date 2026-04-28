import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CustomerStatus, EmployeeStatus } from '../../../generated/prisma/client';
import { RedisService } from '../../redis/services/redis.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { EmployeeRepository } from '../repositories/employee.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let customerRepo: jest.Mocked<CustomerRepository>;
  let employeeRepo: jest.Mocked<EmployeeRepository>;
  let refreshTokenRepo: jest.Mocked<RefreshTokenRepository>;
  let jwtService: jest.Mocked<JwtService>;

  const mockRedisClient = {
    setex: jest.fn(),
  };

  const mockUser = { id: 1, email: 'test@example.com', fullName: 'Test User' };
  const mockMeta = { deviceInfo: 'Test Device', ipAddress: '127.0.0.1' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: CustomerRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: EmployeeRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: RefreshTokenRepository,
          useValue: {
            create: jest.fn(),
            findByHash: jest.fn(),
            revokeAllByUser: jest.fn(),
            consumeIfActive: jest.fn(),
            revokeByHash: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    customerRepo = module.get(CustomerRepository);
    employeeRepo = module.get(EmployeeRepository);
    refreshTokenRepo = module.get(RefreshTokenRepository);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('issueTokenPair', () => {
    it('should issue a token pair for a customer', async () => {
      jwtService.sign.mockReturnValue('access-token');
      refreshTokenRepo.create.mockResolvedValue({} as any);

      const result = await service.issueTokenPair(mockUser, 'CUSTOMER', mockMeta);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
      });
      expect(refreshTokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: mockUser.id,
          deviceInfo: mockMeta.deviceInfo,
        }),
      );
    });

    it('should issue a token pair for an employee', async () => {
      jwtService.sign.mockReturnValue('access-token');
      refreshTokenRepo.create.mockResolvedValue({} as any);

      const result = await service.issueTokenPair(mockUser, 'EMPLOYEE', mockMeta);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
      });
      expect(refreshTokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: mockUser.id,
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'refresh-token';
    const mockStoredToken = {
      id: 1,
      tokenHash: 'hash',
      customerId: 1,
      employeeId: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10000),
    };

    it('should refresh tokens successfully for customer', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(mockStoredToken as any);
      refreshTokenRepo.consumeIfActive.mockResolvedValue(true);
      customerRepo.findById.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        status: CustomerStatus.ACTIVE,
        deletedAt: null,
      } as any);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshTokens(mockRefreshToken, mockMeta);

      expect(result.accessToken).toBe('new-access-token');
      expect(refreshTokenRepo.consumeIfActive).toHaveBeenCalledWith(mockStoredToken.id);
    });

    it('should throw UnauthorizedException if token not found', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(null);

      await expect(service.refreshTokens(mockRefreshToken, mockMeta)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should detect reuse and revoke all tokens', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue({
        ...mockStoredToken,
        revokedAt: new Date(),
      } as any);

      await expect(service.refreshTokens(mockRefreshToken, mockMeta)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenRepo.revokeAllByUser).toHaveBeenCalledWith(1, 'CUSTOMER');
    });

    it('should throw if token is expired', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue({
        ...mockStoredToken,
        expiresAt: new Date(Date.now() - 1000),
      } as any);

      await expect(service.refreshTokens(mockRefreshToken, mockMeta)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if token consumed concurrently', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(mockStoredToken as any);
      refreshTokenRepo.consumeIfActive.mockResolvedValue(false);

      await expect(service.refreshTokens(mockRefreshToken, mockMeta)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if customer is inactive', async () => {
      refreshTokenRepo.findByHash.mockResolvedValue(mockStoredToken as any);
      refreshTokenRepo.consumeIfActive.mockResolvedValue(true);
      customerRepo.findById.mockResolvedValue({
        id: 1,
        status: CustomerStatus.INACTIVE,
      } as any);

      await expect(service.refreshTokens(mockRefreshToken, mockMeta)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should refresh tokens successfully for employee', async () => {
      const employeeStoredToken = { ...mockStoredToken, customerId: null, employeeId: 1 };
      refreshTokenRepo.findByHash.mockResolvedValue(employeeStoredToken as any);
      refreshTokenRepo.consumeIfActive.mockResolvedValue(true);
      employeeRepo.findById.mockResolvedValue({
        id: 1,
        email: 'emp@example.com',
        fullName: 'Employee',
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
      } as any);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshTokens(mockRefreshToken, mockMeta);

      expect(result.accessToken).toBe('new-access-token');
    });
  });

  describe('logout', () => {
    it('should revoke refresh token and blacklist access token', async () => {
      const refreshToken = 'refresh-token';
      const jti = 'jti';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.logout(refreshToken, jti, exp);

      expect(refreshTokenRepo.revokeByHash).toHaveBeenCalled();
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining(jti),
        expect.any(Number),
        '1',
      );
    });

    it('should only blacklist access token if refresh token is not provided', async () => {
      const jti = 'jti';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.logout(undefined, jti, exp);

      expect(refreshTokenRepo.revokeByHash).not.toHaveBeenCalled();
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });
  });

  describe('logoutAll', () => {
    it('should revoke all refresh tokens and blacklist current access token', async () => {
      const userId = 1;
      const jti = 'jti';
      const exp = Math.floor(Date.now() / 1000) + 3600;

      await service.logoutAll(userId, 'CUSTOMER', jti, exp);

      expect(refreshTokenRepo.revokeAllByUser).toHaveBeenCalledWith(userId, 'CUSTOMER');
      expect(mockRedisClient.setex).toHaveBeenCalledTimes(2); // One for markAllSessionsLoggedOut, one for blacklistAccessToken
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all refresh tokens and mark all sessions logged out', async () => {
      const userId = 1;

      await service.revokeAllSessions(userId, 'EMPLOYEE');

      expect(refreshTokenRepo.revokeAllByUser).toHaveBeenCalledWith(userId, 'EMPLOYEE');
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        expect.stringContaining('EMPLOYEE:1'),
        expect.any(Number),
        expect.any(String),
      );
    });
  });
});
