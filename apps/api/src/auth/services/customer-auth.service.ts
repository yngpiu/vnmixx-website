import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import {
  getPrismaErrorTargets,
  isPrismaErrorCode,
  isPrismaKnownRequestError,
} from '../../common/errors/prisma-error.util';
import { MailService } from '../../common/mail/mail.service';
import { RedisService } from '../../redis/redis.service';
import {
  BCRYPT_SALT_ROUNDS,
  CUSTOMER_OTP_ATTEMPTS_PREFIX,
  CUSTOMER_OTP_LENGTH,
  CUSTOMER_OTP_PREFIX,
  CUSTOMER_OTP_RESEND_PREFIX,
  DEFAULT_OTP_EXPIRATION,
  DEFAULT_OTP_MAX_ATTEMPTS,
  DEFAULT_OTP_RESEND_COOLDOWN,
} from '../constants';
import type {
  CustomerRegisterResponseDto,
  LoginDto,
  RegisterDto,
  ResendCustomerOtpDto,
  VerifyCustomerOtpDto,
} from '../dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { parseDob } from '../utils';
import { OtpService } from './otp.service';

export interface CustomerAuthIdentity {
  id: number;
  email: string;
  fullName: string;
}

@Injectable()
/**
 * Service xử lý logic xác thực cho Khách hàng (Customer).
 * Bao gồm các quy trình: Đăng ký tài khoản, Xác thực mã OTP qua email, Đăng nhập, và Đổi mật khẩu.
 */
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);
  private readonly saltRounds: number;
  private readonly otpExpiration: number;
  private readonly otpResendCooldown: number;
  private readonly otpMaxAttempts: number;

  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly otpService: OtpService,
  ) {
    this.saltRounds = Math.min(Math.max(BCRYPT_SALT_ROUNDS, 4), 31);
    this.otpExpiration = DEFAULT_OTP_EXPIRATION;
    this.otpResendCooldown = DEFAULT_OTP_RESEND_COOLDOWN;
    this.otpMaxAttempts = DEFAULT_OTP_MAX_ATTEMPTS;
  }

  /**
   * Đăng ký khách hàng mới.
   * Logic: Kiểm tra email/SĐT duy nhất -> Hash mật khẩu -> Lưu database (trạng thái chưa kích hoạt) -> Gửi OTP xác thực qua email.
   */
  async registerCustomer(dto: RegisterDto): Promise<CustomerRegisterResponseDto> {
    await this.assertCustomerEmailNotTaken(dto.email);
    await this.assertCustomerPhoneNotTaken(dto.phoneNumber);
    const hashedPassword = await hash(dto.password, this.saltRounds);
    const dob = parseDob(dto.dob);
    const customer = await this.createCustomerOrThrowConflict({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      hashedPassword,
      dob,
      gender: dto.gender ?? null,
      isActive: false,
    });
    const otpMeta = await this.issueVerificationOtp(customer.id, customer.email);
    return {
      message: 'Đăng ký thành công. Vui lòng xác thực email bằng mã OTP đã gửi.',
      email: customer.email,
      ...otpMeta,
    };
  }

  /**
   * Xác thực mã OTP email của khách hàng.
   * Logic: Kiểm tra OTP trong Redis -> So khớp mã băm -> Kích hoạt tài khoản trong DB -> Xóa OTP đã sử dụng.
   */
  async verifyCustomerOtp(dto: VerifyCustomerOtpDto): Promise<CustomerAuthIdentity> {
    const customer = await this.customerRepo.findByEmail(dto.email);
    if (!customer || customer.deletedAt) {
      throw new BadRequestException('Yêu cầu xác thực không hợp lệ');
    }
    if (customer.emailVerifiedAt) {
      if (!customer.isActive) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      throw new BadRequestException('Email đã được xác thực');
    }
    const otpKey = this.getCustomerOtpKey(dto.email);
    const attemptsKey = this.getCustomerOtpAttemptsKey(dto.email);
    const otpPayloadRaw = await this.redis.getClient().get(otpKey);
    if (!otpPayloadRaw) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    const payload = this.otpService.parseOtpPayload(otpPayloadRaw);
    if (!payload || payload.customerId !== customer.id) {
      await this.redis.getClient().del(otpKey, attemptsKey);
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    const incomingOtpHash = this.otpService.hashOtp(dto.otp);
    if (!this.otpService.hasMatchingHash(payload.otpHash, incomingOtpHash)) {
      const attempts = await this.otpService.incrementFailedAttempt(attemptsKey, otpKey);
      if (attempts >= this.otpMaxAttempts) {
        throw new HttpException(
          'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu OTP mới.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException('OTP không chính xác');
    }
    const activated = await this.customerRepo.activateEmailById(customer.id);
    if (!activated) throw new BadRequestException('Không thể xác thực tài khoản này');
    await this.redis.getClient().del(otpKey, attemptsKey, this.getCustomerOtpResendKey(dto.email));
    return { id: customer.id, email: customer.email, fullName: customer.fullName };
  }

  /**
   * Gửi lại mã OTP xác thực email.
   * Logic: Kiểm tra cooldown (thời gian chờ giữa các lần gửi) -> Tạo và gửi OTP mới qua email.
   */
  async resendCustomerOtp(dto: ResendCustomerOtpDto): Promise<CustomerRegisterResponseDto> {
    const customer = await this.customerRepo.findByEmail(dto.email);
    if (!customer || customer.deletedAt) {
      throw new BadRequestException('Yêu cầu xác thực không hợp lệ');
    }
    if (customer.emailVerifiedAt) {
      if (!customer.isActive) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      throw new BadRequestException('Email đã được xác thực');
    }
    await this.otpService.assertResendNotInCooldown(this.getCustomerOtpResendKey(dto.email));
    const otpMeta = await this.issueVerificationOtp(customer.id, customer.email);
    return {
      message: 'Mã OTP mới đã được gửi tới email của bạn.',
      email: customer.email,
      ...otpMeta,
    };
  }

  /**
   * Đăng nhập khách hàng.
   * Logic: Tìm theo email -> Kiểm tra trạng thái tài khoản (Active/Verified) -> So sánh mật khẩu băm.
   */
  async loginCustomer(dto: LoginDto): Promise<CustomerAuthIdentity> {
    const customer = await this.customerRepo.findByEmail(dto.email);
    if (!customer || customer.deletedAt) {
      throw new UnauthorizedException('Email hoặc mật khẩu không hợp lệ');
    }
    if (!customer.isActive) {
      if (!customer.emailVerifiedAt) throw new UnauthorizedException('Email chưa được xác thực');
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }
    const isPasswordValid = await compare(dto.password, customer.hashedPassword);
    if (!isPasswordValid) throw new UnauthorizedException('Email hoặc mật khẩu không hợp lệ');
    return { id: customer.id, email: customer.email, fullName: customer.fullName };
  }

  /**
   * Đổi mật khẩu cho khách hàng đã đăng nhập.
   * Logic: Xác thực mật khẩu cũ -> Hash mật khẩu mới -> Cập nhật database.
   */
  async changePassword(
    customerId: number,
    dto: { currentPassword?: string; newPassword?: string },
  ): Promise<void> {
    const currentHash = await this.customerRepo.findHashedPasswordById(customerId);
    if (!currentHash) throw new BadRequestException('Không tìm thấy khách hàng');

    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('Cần cung cấp mật khẩu cũ và mật khẩu mới');
    }

    const isCurrentPasswordValid = await compare(dto.currentPassword, currentHash);
    if (!isCurrentPasswordValid)
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');

    const newHashedPassword = await hash(dto.newPassword, this.saltRounds);
    const updated = await this.customerRepo.updatePassword(customerId, newHashedPassword);
    if (!updated) throw new BadRequestException('Không thể cập nhật mật khẩu');
  }

  // ── OTP helpers ────────────────────────────────────────────────────────────

  private async issueVerificationOtp(
    customerId: number,
    email: string,
  ): Promise<{ otpExpiresIn: number; resendAfter: number }> {
    return this.otpService.issueOtp({
      customerId,
      otpKey: this.getCustomerOtpKey(email),
      attemptsKey: this.getCustomerOtpAttemptsKey(email),
      resendKey: this.getCustomerOtpResendKey(email),
      otpLength: CUSTOMER_OTP_LENGTH,
      expirationSeconds: this.otpExpiration,
      cooldownSeconds: this.otpResendCooldown,
      sendFn: (otp) =>
        this.mail.sendMailWithTemplate(email, 'VERIFICATION_OTP', {
          otp,
          expiresInMinutes: Math.ceil(this.otpExpiration / 60),
        }),
    });
  }

  private getCustomerOtpKey(email: string): string {
    return `${CUSTOMER_OTP_PREFIX}${email}`;
  }

  private getCustomerOtpAttemptsKey(email: string): string {
    return `${CUSTOMER_OTP_ATTEMPTS_PREFIX}${email}`;
  }

  private getCustomerOtpResendKey(email: string): string {
    return `${CUSTOMER_OTP_RESEND_PREFIX}${email}`;
  }

  private async createCustomerOrThrowConflict(data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    hashedPassword: string;
    dob: Date | null;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    isActive?: boolean;
  }) {
    try {
      return await this.customerRepo.create(data);
    } catch (error) {
      if (isPrismaErrorCode(error, 'P2002') && isPrismaKnownRequestError(error)) {
        const targets = this.extractConstraintTargets(getPrismaErrorTargets(error));
        if (targets.some((target) => target.includes('email'))) {
          throw new ConflictException('Email đã được đăng ký');
        }
        if (targets.some((target) => target.includes('phone'))) {
          throw new ConflictException('Số điện thoại đã được đăng ký');
        }
        throw new ConflictException('Tài khoản khách hàng đã tồn tại');
      }
      throw error;
    }
  }

  private extractConstraintTargets(target: unknown): string[] {
    if (Array.isArray(target)) return target.map((item) => String(item).toLowerCase());
    if (typeof target === 'string') return [target.toLowerCase()];
    return [];
  }

  private async assertCustomerEmailNotTaken(email: string): Promise<void> {
    const isTaken = await this.customerRepo.existsByEmail(email);
    if (isTaken) throw new ConflictException('Email đã được đăng ký');
  }

  private async assertCustomerPhoneNotTaken(phoneNumber: string): Promise<void> {
    const isTaken = await this.customerRepo.existsByPhone(phoneNumber);
    if (isTaken) throw new ConflictException('Số điện thoại đã được đăng ký');
  }
}
