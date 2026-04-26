import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../../mail/services/mail.service';
import { RedisService } from '../../redis/services/redis.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { OtpService } from './otp.service';
import { PasswordResetService } from './password-reset.service';

jest.mock('bcrypt');

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let customerRepo: jest.Mocked<CustomerRepository>;
  let otpService: jest.Mocked<OtpService>;

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
  };

  const mockOtpService = {
    hashOtp: jest.fn().mockImplementation((otp) => `hashed-${otp}`),
    hasMatchingHash: jest.fn(),
    parseOtpPayload: jest.fn(),
    incrementFailedAttempt: jest.fn(),
    assertResendNotInCooldown: jest.fn(),
    issueOtp: jest.fn(),
  };

  const mockCustomer = {
    id: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    isActive: true,
    emailVerifiedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        {
          provide: CustomerRepository,
          useValue: {
            findByEmail: jest.fn(),
            updatePassword: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendMailWithTemplate: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    customerRepo = module.get(CustomerRepository);
    otpService = module.get(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPasswordReset', () => {
    const dto = { email: 'test@example.com' };

    it('should issue reset OTP if customer is valid', async () => {
      customerRepo.findByEmail.mockResolvedValue(mockCustomer as any);
      otpService.assertResendNotInCooldown.mockResolvedValue(undefined);
      otpService.issueOtp.mockResolvedValue({ otpExpiresIn: 300, resendAfter: 60 });

      const result = await service.requestPasswordReset(dto);

      expect(result.message).toContain('Mã đặt lại mật khẩu đã được gửi');
      expect(otpService.issueOtp).toHaveBeenCalled();
    });

    it('should return generic message if customer not found', async () => {
      customerRepo.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset(dto);

      expect(result.message).toContain('Nếu email đã đăng ký');
      expect(otpService.issueOtp).not.toHaveBeenCalled();
    });
  });

  describe('verifyPasswordResetOtp', () => {
    const dto = { email: 'test@example.com', otp: '123456' };

    it('should return reset token on valid OTP', async () => {
      customerRepo.findByEmail.mockResolvedValue(mockCustomer as any);
      const payload = { customerId: 1, otpHash: 'h' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(payload));
      otpService.parseOtpPayload.mockReturnValue(payload);
      otpService.hashOtp.mockReturnValue('h');
      otpService.hasMatchingHash.mockReturnValue(true);

      const result = await service.verifyPasswordResetOtp(dto);

      expect(result.resetToken).toBeDefined();
      expect(mockRedisClient.setex).toHaveBeenCalled();
    });

    it('should throw BadRequestException on wrong OTP', async () => {
      customerRepo.findByEmail.mockResolvedValue(mockCustomer as any);
      mockRedisClient.get.mockResolvedValue('{}');
      otpService.parseOtpPayload.mockReturnValue({ customerId: 1, otpHash: 'test-hash' });
      otpService.hasMatchingHash.mockReturnValue(false);
      otpService.incrementFailedAttempt.mockResolvedValue(1);

      await expect(service.verifyPasswordResetOtp(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    const dto = { email: 'test@example.com', resetToken: 'uuid', newPassword: 'new' };

    it('should update password with valid token', async () => {
      customerRepo.findByEmail.mockResolvedValue(mockCustomer as any);
      const hash = crypto.createHash('sha256').update('uuid').digest('hex');
      mockRedisClient.get.mockResolvedValue(hash);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      customerRepo.updatePassword.mockResolvedValue(true);

      const result = await service.resetPassword(dto);

      expect(result.customerId).toBe(1);
      expect(customerRepo.updatePassword).toHaveBeenCalledWith(1, 'new-hash');
    });

    it('should throw BadRequestException if token invalid', async () => {
      customerRepo.findByEmail.mockResolvedValue(mockCustomer as any);
      mockRedisClient.get.mockResolvedValue('wrong-hash');

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
