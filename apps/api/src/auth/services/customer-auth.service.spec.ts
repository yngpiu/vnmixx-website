import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { CustomerStatus } from '../../../generated/prisma/client';
import { MailService } from '../../mail/services/mail.service';
import { RedisService } from '../../redis/services/redis.service';
import {
  ChangePasswordDto,
  GenderInput,
  LoginDto,
  RegisterDto,
  VerifyCustomerOtpDto,
} from '../dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerAuthService } from './customer-auth.service';
import { OtpService } from './otp.service';

jest.mock('bcrypt');

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let customerRepo: jest.Mocked<CustomerRepository>;
  let otpService: jest.Mocked<OtpService>;

  const mockRedisClient = {
    get: jest.fn(),
    setex: jest.fn().mockReturnThis(),
    del: jest.fn().mockReturnThis(),
    multi: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    pttl: jest.fn(),
  };

  const mockOtpService = {
    generateOtpCode: jest.fn().mockReturnValue('123456'),
    hashOtp: jest.fn().mockImplementation((otp: string) => `hashed-${otp}`),
    hasMatchingHash: jest.fn().mockImplementation((h1: string, h2: string) => h1 === h2),
    parseOtpPayload: jest.fn(),
    incrementFailedAttempt: jest.fn(),
    assertResendNotInCooldown: jest.fn(),
    issueOtp: jest.fn(),
  };

  const mockCustomer = {
    id: 1,
    email: 'test@example.com',
    fullName: 'Test User',
    phoneNumber: '0123456789',
    hashedPassword: 'hashed-password',
    status: CustomerStatus.ACTIVE,
    emailVerifiedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAuthService,
        {
          provide: CustomerRepository,
          useValue: {
            existsByEmail: jest.fn(),
            existsByPhone: jest.fn(),
            create: jest.fn(),
            findByEmail: jest.fn(),
            findByPhone: jest.fn(),
            activateEmailById: jest.fn(),
            findHashedPasswordById: jest.fn(),
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
            isConfigured: jest.fn().mockReturnValue(false),
            sendMail: jest.fn(),
            sendMailWithTemplate: jest.fn(),
          },
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
      ],
    }).compile();

    service = module.get<CustomerAuthService>(CustomerAuthService);
    customerRepo = module.get(CustomerRepository);
    otpService = module.get(OtpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCustomer', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      fullName: 'Test User',
      phoneNumber: '0123456789',
      dob: '1990-01-01',
      gender: GenderInput.MALE,
    };

    it('should register a customer successfully', async () => {
      customerRepo.existsByEmail.mockResolvedValue(false);
      customerRepo.existsByPhone.mockResolvedValue(false);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      customerRepo.create.mockResolvedValue(mockCustomer as any);
      otpService.issueOtp.mockResolvedValue({ otpExpiresIn: 300, resendAfter: 60 });

      const result = await service.registerCustomer(registerDto);

      expect(result.email).toBe(registerDto.email);
      expect(customerRepo.create).toHaveBeenCalled();
      expect(otpService.issueOtp).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is taken', async () => {
      customerRepo.existsByEmail.mockResolvedValue(true);

      await expect(service.registerCustomer(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if phone is taken', async () => {
      customerRepo.existsByEmail.mockResolvedValue(false);
      customerRepo.existsByPhone.mockResolvedValue(true);

      await expect(service.registerCustomer(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyCustomerOtp', () => {
    const verifyDto: VerifyCustomerOtpDto = { email: 'test@example.com', otp: '123456' };

    it('should verify OTP successfully', async () => {
      customerRepo.findByEmail.mockResolvedValue({ ...mockCustomer, emailVerifiedAt: null } as any);
      const otpPayload = { customerId: 1, otpHash: 'hashed-123456' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(otpPayload));
      otpService.parseOtpPayload.mockReturnValue(otpPayload);
      otpService.hashOtp.mockReturnValue('hashed-123456');
      otpService.hasMatchingHash.mockReturnValue(true);
      customerRepo.activateEmailById.mockResolvedValue(true);

      const result = await service.verifyCustomerOtp(verifyDto);

      expect(result.id).toBe(1);
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it('should throw BadRequestException for wrong OTP', async () => {
      customerRepo.findByEmail.mockResolvedValue({ ...mockCustomer, emailVerifiedAt: null } as any);
      const otpPayload = { customerId: 1, otpHash: 'hashed-other' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(otpPayload));
      otpService.parseOtpPayload.mockReturnValue(otpPayload);
      otpService.hashOtp.mockReturnValue('hashed-123456');
      otpService.hasMatchingHash.mockReturnValue(false);
      otpService.incrementFailedAttempt.mockResolvedValue(1);

      await expect(service.verifyCustomerOtp(verifyDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw TOO_MANY_REQUESTS after max attempts', async () => {
      customerRepo.findByEmail.mockResolvedValue({ ...mockCustomer, emailVerifiedAt: null } as any);
      const otpPayload = { customerId: 1, otpHash: 'hashed-other' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(otpPayload));
      otpService.parseOtpPayload.mockReturnValue(otpPayload);
      otpService.hasMatchingHash.mockReturnValue(false);
      otpService.incrementFailedAttempt.mockResolvedValue(5);

      const promise = service.verifyCustomerOtp(verifyDto);
      await expect(promise).rejects.toBeInstanceOf(HttpException);
      await expect(promise).rejects.toMatchObject({
        getStatus: expect.any(Function),
      });
      await promise.catch((error: HttpException) =>
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS),
      );
    });
  });

  describe('loginCustomer', () => {
    const loginDto: LoginDto = { email: 'test@example.com', password: 'password123' };

    it('should login successfully', async () => {
      customerRepo.findByEmail.mockResolvedValue(mockCustomer as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginCustomer(loginDto);

      expect(result.id).toBe(mockCustomer.id);
    });

    it('should login successfully with phone number', async () => {
      const loginPhoneDto: LoginDto = { email: '0901234567', password: 'password123' };
      customerRepo.findByPhone.mockResolvedValue(mockCustomer as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginCustomer(loginPhoneDto);

      expect(result.id).toBe(mockCustomer.id);
      expect(customerRepo.findByPhone).toHaveBeenCalledWith('0901234567');
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      customerRepo.findByEmail.mockResolvedValue(mockCustomer as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.loginCustomer(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account inactive', async () => {
      customerRepo.findByEmail.mockResolvedValue({
        ...mockCustomer,
        status: CustomerStatus.INACTIVE,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const promise = service.loginCustomer(loginDto);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Tài khoản đã bị vô hiệu hóa');
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      customerRepo.findByEmail.mockResolvedValue({
        ...mockCustomer,
        emailVerifiedAt: null,
        status: CustomerStatus.PENDING_VERIFICATION,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const promise = service.loginCustomer(loginDto);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Email chưa được xác thực');
    });
  });

  describe('resendCustomerOtp', () => {
    it('should resend OTP successfully', async () => {
      customerRepo.findByEmail.mockResolvedValue({ ...mockCustomer, emailVerifiedAt: null } as any);
      otpService.assertResendNotInCooldown.mockResolvedValue(undefined);
      otpService.issueOtp.mockResolvedValue({ otpExpiresIn: 300, resendAfter: 60 });

      const result = await service.resendCustomerOtp({ email: 'test@example.com' });

      expect(result.message).toContain('Mã OTP mới đã được gửi');
    });
  });

  describe('changePassword', () => {
    const changeDto: ChangePasswordDto = { currentPassword: 'old', newPassword: 'new' };

    it('should change password successfully', async () => {
      customerRepo.findHashedPasswordById.mockResolvedValue('old-hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      customerRepo.updatePassword.mockResolvedValue(true);

      await service.changePassword(1, changeDto);

      expect(customerRepo.updatePassword).toHaveBeenCalledWith(1, 'new-hash');
    });

    it('should throw BadRequestException if customer not found', async () => {
      customerRepo.findHashedPasswordById.mockResolvedValue(null);

      await expect(service.changePassword(1, changeDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if current password wrong', async () => {
      customerRepo.findHashedPasswordById.mockResolvedValue('old-hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, changeDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
