import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../redis/services/redis.service';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;
  let redis: any;

  const mockMulti = {
    setex: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    ttl: jest.fn(),
    pttl: jest.fn(),
    expire: jest.fn(),
    multi: jest.fn().mockReturnValue(mockMulti),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
    redis = mockRedisClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('generateOtpCode should return string of correct length', () => {
    const otp = service.generateOtpCode(6);
    expect(otp).toHaveLength(6);
    expect(/^\d+$/.test(otp)).toBe(true);
  });

  it('hashOtp and hasMatchingHash should work together', () => {
    const otp = '123456';
    const hash = service.hashOtp(otp);
    expect(service.hasMatchingHash(hash, service.hashOtp(otp))).toBe(true);
    expect(service.hasMatchingHash(hash, service.hashOtp('654321'))).toBe(false);
  });

  describe('parseOtpPayload', () => {
    it('should return payload object for valid JSON', () => {
      const payload = { customerId: 1, otpHash: 'abc' };
      expect(service.parseOtpPayload(JSON.stringify(payload))).toEqual(payload);
    });

    it('should return null for invalid JSON or format', () => {
      expect(service.parseOtpPayload('invalid')).toBeNull();
      expect(service.parseOtpPayload(JSON.stringify({ id: 1 }))).toBeNull();
    });
  });

  describe('incrementFailedAttempt', () => {
    it('should increment and set expiration on first attempt', async () => {
      redis.incr.mockResolvedValue(1);
      redis.pttl.mockResolvedValue(60000);

      const attempts = await service.incrementFailedAttempt('attemptsKey', 'otpKey');

      expect(attempts).toBe(1);
      expect(redis.expire).toHaveBeenCalledWith('attemptsKey', 60);
    });
  });

  describe('assertResendNotInCooldown', () => {
    it('should throw TOO_MANY_REQUESTS if TTL > 0', async () => {
      redis.ttl.mockResolvedValue(30);
      await expect(service.assertResendNotInCooldown('key')).rejects.toThrow(HttpException);
    });

    it('should not throw if TTL <= 0', async () => {
      redis.ttl.mockResolvedValue(0);
      await expect(service.assertResendNotInCooldown('key')).resolves.not.toThrow();
    });
  });

  describe('issueOtp', () => {
    const params = {
      otpKey: 'ok',
      attemptsKey: 'ak',
      resendKey: 'rk',
      customerId: 1,
      otpLength: 6,
      expirationSeconds: 300,
      cooldownSeconds: 60,
      sendFn: jest.fn(),
    };

    it('should set redis keys and call sendFn', async () => {
      mockMulti.exec.mockResolvedValue([]);
      params.sendFn.mockResolvedValue(undefined);

      const result = await service.issueOtp(params);

      expect(result.otpExpiresIn).toBe(300);
      expect(redis.multi).toHaveBeenCalled();
      expect(params.sendFn).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalledWith('rk', 60, '1');
    });

    it('should rollback and throw InternalServerErrorException if sendFn fails', async () => {
      mockMulti.exec.mockResolvedValue([]);
      params.sendFn.mockRejectedValue(new Error('SMTP Error'));

      await expect(service.issueOtp(params)).rejects.toThrow(InternalServerErrorException);
      expect(redis.del).toHaveBeenCalledWith('ok', 'ak');
    });
  });
});
