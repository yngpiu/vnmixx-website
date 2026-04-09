import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { createHash, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { Prisma } from 'generated/prisma/client';
import { MailService } from '../../common/mail/mail.service';

import { RedisService } from '../../redis/redis.service';
import {
  BCRYPT_SALT_ROUNDS,
  CUSTOMER_OTP_ATTEMPTS_PREFIX,
  CUSTOMER_OTP_LENGTH,
  CUSTOMER_OTP_PREFIX,
  CUSTOMER_OTP_RESEND_PREFIX,
  CUSTOMER_RESET_OTP_ATTEMPTS_PREFIX,
  CUSTOMER_RESET_OTP_PREFIX,
  CUSTOMER_RESET_OTP_RESEND_PREFIX,
  CUSTOMER_RESET_TOKEN_PREFIX,
  DEFAULT_OTP_EXPIRATION,
  DEFAULT_OTP_MAX_ATTEMPTS,
  DEFAULT_OTP_RESEND_COOLDOWN,
  DEFAULT_RESET_TOKEN_EXPIRATION,
} from '../constants';
import type {
  ChangePasswordDto,
  CustomerRegisterResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ForgotPasswordVerifyOtpDto,
  LoginDto,
  RegisterDto,
  ResendCustomerOtpDto,
  ResetPasswordDto,
  ResetTokenResponseDto,
  VerifyCustomerOtpDto,
} from '../dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { normalizeEmail, parseDob } from '../utils';

export interface CustomerAuthIdentity {
  id: number;
  email: string;
  fullName: string;
}

interface CustomerOtpPayload {
  customerId: number;
  otpHash: string;
}

@Injectable()
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
  ) {
    this.saltRounds = Math.min(Math.max(BCRYPT_SALT_ROUNDS, 4), 31);
    this.otpExpiration = DEFAULT_OTP_EXPIRATION;
    this.otpResendCooldown = DEFAULT_OTP_RESEND_COOLDOWN;
    this.otpMaxAttempts = DEFAULT_OTP_MAX_ATTEMPTS;
  }

  /** Register a new customer and send email OTP for verification. */
  async registerCustomer(dto: RegisterDto): Promise<CustomerRegisterResponseDto> {
    const normalizedEmail = normalizeEmail(dto.email);
    await this.assertCustomerEmailNotTaken(normalizedEmail);
    await this.assertCustomerPhoneNotTaken(dto.phoneNumber);
    const hashedPassword = await hash(dto.password, this.saltRounds);
    const dob = parseDob(dto.dob);
    const customer = await this.createCustomerOrThrowConflict({
      fullName: dto.fullName,
      email: normalizedEmail,
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

  /** Verify customer email OTP and return authenticated user identity. */
  async verifyCustomerOtp(dto: VerifyCustomerOtpDto): Promise<CustomerAuthIdentity> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
    if (!customer || customer.deletedAt) {
      throw new BadRequestException('Yêu cầu xác thực không hợp lệ');
    }
    if (customer.emailVerifiedAt) {
      if (!customer.isActive) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      throw new BadRequestException('Email đã được xác thực');
    }
    const otpKey = this.getCustomerOtpKey(normalizedEmail);
    const attemptsKey = this.getCustomerOtpAttemptsKey(normalizedEmail);
    const otpPayloadRaw = await this.redis.getClient().get(otpKey);
    if (!otpPayloadRaw) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    const payload = this.parseCustomerOtpPayload(otpPayloadRaw);
    if (!payload || payload.customerId !== customer.id) {
      await this.redis.getClient().del(otpKey, attemptsKey);
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    const incomingOtpHash = this.hashOtp(dto.otp);
    if (!this.hasMatchingHash(payload.otpHash, incomingOtpHash)) {
      const attempts = await this.incrementFailedOtpAttempt(attemptsKey, otpKey);
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
    await this.redis
      .getClient()
      .del(otpKey, attemptsKey, this.getCustomerOtpResendKey(normalizedEmail));
    return { id: customer.id, email: customer.email, fullName: customer.fullName };
  }

  /** Resend customer email verification OTP with cooldown protection. */
  async resendCustomerOtp(dto: ResendCustomerOtpDto): Promise<CustomerRegisterResponseDto> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
    if (!customer || customer.deletedAt) {
      throw new BadRequestException('Yêu cầu xác thực không hợp lệ');
    }
    if (customer.emailVerifiedAt) {
      if (!customer.isActive) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      throw new BadRequestException('Email đã được xác thực');
    }
    await this.assertOtpResendNotInCooldown(normalizedEmail);
    const otpMeta = await this.issueVerificationOtp(customer.id, customer.email);
    return {
      message: 'Mã OTP mới đã được gửi tới email của bạn.',
      email: customer.email,
      ...otpMeta,
    };
  }

  /** Authenticate an existing customer and return identity. */
  async loginCustomer(dto: LoginDto): Promise<CustomerAuthIdentity> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
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

  /** Change the password of an authenticated customer. */
  async changePassword(customerId: number, dto: ChangePasswordDto): Promise<void> {
    const currentHash = await this.customerRepo.findHashedPasswordById(customerId);
    if (!currentHash) throw new BadRequestException('Không tìm thấy khách hàng');

    const isCurrentPasswordValid = await compare(dto.currentPassword, currentHash);
    if (!isCurrentPasswordValid)
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');

    const newHashedPassword = await hash(dto.newPassword, this.saltRounds);
    const updated = await this.customerRepo.updatePassword(customerId, newHashedPassword);
    if (!updated) throw new BadRequestException('Không thể cập nhật mật khẩu');
  }

  /** Request a password reset OTP to be sent to the customer's email. */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
    if (!customer || customer.deletedAt || !customer.isActive || !customer.emailVerifiedAt) {
      return {
        message: 'Nếu email đã đăng ký và đã xác thực, mã đặt lại đã được gửi.',
        email: normalizedEmail,
        otpExpiresIn: this.otpExpiration,
        resendAfter: this.otpResendCooldown,
      };
    }
    await this.assertResetOtpResendNotInCooldown(normalizedEmail);
    const otpMeta = await this.issuePasswordResetOtp(customer.id, customer.email);
    return {
      message: 'Mã đặt lại mật khẩu đã được gửi tới email của bạn.',
      email: customer.email,
      ...otpMeta,
    };
  }

  /** Verify the password reset OTP and return a one-time mã đặt lại. */
  async verifyPasswordResetOtp(dto: ForgotPasswordVerifyOtpDto): Promise<ResetTokenResponseDto> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
    if (!customer || customer.deletedAt || !customer.isActive || !customer.emailVerifiedAt) {
      throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
    }
    const otpKey = this.getResetOtpKey(normalizedEmail);
    const attemptsKey = this.getResetOtpAttemptsKey(normalizedEmail);
    const otpPayloadRaw = await this.redis.getClient().get(otpKey);
    if (!otpPayloadRaw) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    const payload = this.parseCustomerOtpPayload(otpPayloadRaw);
    if (!payload || payload.customerId !== customer.id) {
      await this.redis.getClient().del(otpKey, attemptsKey);
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    const incomingOtpHash = this.hashOtp(dto.otp);
    if (!this.hasMatchingHash(payload.otpHash, incomingOtpHash)) {
      const attempts = await this.incrementFailedOtpAttempt(attemptsKey, otpKey);
      if (attempts >= this.otpMaxAttempts) {
        throw new HttpException(
          'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã đặt lại mới.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException('OTP không chính xác');
    }
    const resetToken = randomUUID();
    const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
    const resetKey = this.getResetTokenKey(normalizedEmail);
    await this.redis.getClient().setex(resetKey, DEFAULT_RESET_TOKEN_EXPIRATION, resetTokenHash);
    await this.redis
      .getClient()
      .del(otpKey, attemptsKey, this.getResetOtpResendKey(normalizedEmail));
    return { resetToken };
  }

  /** Reset the customer's password using a valid mã đặt lại. */
  async resetPassword(dto: ResetPasswordDto): Promise<{ customerId: number }> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
    if (!customer || customer.deletedAt || !customer.isActive || !customer.emailVerifiedAt) {
      throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
    }
    const resetKey = this.getResetTokenKey(normalizedEmail);
    const storedHash = await this.redis.getClient().get(resetKey);
    if (!storedHash) {
      throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
    }
    const incomingHash = createHash('sha256').update(dto.resetToken).digest('hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const incomingBuffer = Buffer.from(incomingHash, 'hex');
    const isValid =
      storedBuffer.length > 0 &&
      storedBuffer.length === incomingBuffer.length &&
      timingSafeEqual(storedBuffer, incomingBuffer);
    if (!isValid) {
      throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
    }
    const newHashedPassword = await hash(dto.newPassword, this.saltRounds);
    const updated = await this.customerRepo.updatePassword(customer.id, newHashedPassword);
    if (!updated) throw new BadRequestException('Không thể cập nhật mật khẩu');
    await this.redis.getClient().del(resetKey);
    return { customerId: customer.id };
  }

  // ── Password reset OTP helpers ────────────────────────────────────────────

  private async issuePasswordResetOtp(
    customerId: number,
    email: string,
  ): Promise<{ otpExpiresIn: number; resendAfter: number }> {
    const redis = this.redis.getClient();
    const otp = this.generateOtpCode(CUSTOMER_OTP_LENGTH);
    const otpPayload: CustomerOtpPayload = { customerId, otpHash: this.hashOtp(otp) };
    const otpKey = this.getResetOtpKey(email);
    const attemptsKey = this.getResetOtpAttemptsKey(email);
    const resendKey = this.getResetOtpResendKey(email);
    await redis
      .multi()
      .setex(otpKey, this.otpExpiration, JSON.stringify(otpPayload))
      .del(attemptsKey)
      .exec();
    try {
      await this.sendPasswordResetOtp(email, otp, this.otpExpiration);
    } catch (error) {
      this.logger.error(
        `Không thể gửi email OTP đặt lại mật khẩu tới ${email}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
      await redis.del(otpKey, attemptsKey);
      throw new InternalServerErrorException('Không thể gửi email mã đặt lại. Vui lòng thử lại.');
    }
    await redis.setex(resendKey, this.otpResendCooldown, '1');
    return { otpExpiresIn: this.otpExpiration, resendAfter: this.otpResendCooldown };
  }

  private async sendPasswordResetOtp(
    email: string,
    otp: string,
    otpExpiresInSeconds: number,
  ): Promise<void> {
    const expiresInMinutes = Math.ceil(otpExpiresInSeconds / 60);
    if (!this.mail.isConfigured()) {
      this.logger.log(
        `[OTP DEV] password-reset email=${email} otp=${otp} expiresIn=${otpExpiresInSeconds}s`,
      );
      return;
    }
    await this.mail.sendMail({
      to: email,
      subject: 'VNMIXX - Password reset code',
      text:
        `Mã đặt lại mật khẩu VNMIXX của bạn là: ${otp}\n\n` +
        `Mã này sẽ hết hạn sau ${expiresInMinutes} minute(s).\n` +
        'Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
          <h2 style="margin:0 0 12px">Đặt lại mật khẩu VNMIXX</h2>
          <p style="margin:0 0 12px">Mã đặt lại mật khẩu của bạn là:</p>
          <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700">${otp}</p>
          <p style="margin:0 0 8px">Mã này sẽ hết hạn sau ${expiresInMinutes} minute(s).</p>
          <p style="margin:0;color:#666">Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.</p>
        </div>
      `,
    });
  }

  private async assertResetOtpResendNotInCooldown(email: string): Promise<void> {
    const resendKey = this.getResetOtpResendKey(email);
    const cooldownTtl = await this.redis.getClient().ttl(resendKey);
    if (cooldownTtl > 0) {
      throw new HttpException(
        `Vui lòng chờ ${cooldownTtl} giây trước khi yêu cầu mã đặt lại mới.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private getResetOtpKey(email: string): string {
    return `${CUSTOMER_RESET_OTP_PREFIX}${email}`;
  }

  private getResetOtpAttemptsKey(email: string): string {
    return `${CUSTOMER_RESET_OTP_ATTEMPTS_PREFIX}${email}`;
  }

  private getResetOtpResendKey(email: string): string {
    return `${CUSTOMER_RESET_OTP_RESEND_PREFIX}${email}`;
  }

  private getResetTokenKey(email: string): string {
    return `${CUSTOMER_RESET_TOKEN_PREFIX}${email}`;
  }

  // ── OTP helpers ────────────────────────────────────────────────────────────

  private async issueVerificationOtp(
    customerId: number,
    email: string,
  ): Promise<{ otpExpiresIn: number; resendAfter: number }> {
    const redis = this.redis.getClient();
    const otp = this.generateOtpCode(CUSTOMER_OTP_LENGTH);
    const otpPayload: CustomerOtpPayload = { customerId, otpHash: this.hashOtp(otp) };
    const otpKey = this.getCustomerOtpKey(email);
    const attemptsKey = this.getCustomerOtpAttemptsKey(email);
    const resendKey = this.getCustomerOtpResendKey(email);
    await redis
      .multi()
      .setex(otpKey, this.otpExpiration, JSON.stringify(otpPayload))
      .del(attemptsKey)
      .exec();
    try {
      await this.sendVerificationOtp(email, otp, this.otpExpiration);
    } catch (error) {
      this.logger.error(
        `Failed to send OTP email to ${email}: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
      );
      await redis.del(otpKey, attemptsKey);
      throw new InternalServerErrorException('Không thể gửi email OTP. Vui lòng thử lại.');
    }
    await redis.setex(resendKey, this.otpResendCooldown, '1');
    return { otpExpiresIn: this.otpExpiration, resendAfter: this.otpResendCooldown };
  }

  private async sendVerificationOtp(
    email: string,
    otp: string,
    otpExpiresInSeconds: number,
  ): Promise<void> {
    const expiresInMinutes = Math.ceil(otpExpiresInSeconds / 60);
    if (!this.mail.isConfigured()) {
      this.logger.log(`[OTP DEV] email=${email} otp=${otp} expiresIn=${otpExpiresInSeconds}s`);
      return;
    }
    await this.mail.sendMail({
      to: email,
      subject: 'VNMIXX - Mã xác thực email',
      text:
        `Mã xác thực VNMIXX của bạn là: ${otp}\n\n` +
        `Mã này sẽ hết hạn sau ${expiresInMinutes} minute(s).\n` +
        'Nếu bạn không yêu cầu thao tác này, bạn có thể bỏ qua email này.',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
          <h2 style="margin:0 0 12px">Xác thực email VNMIXX</h2>
          <p style="margin:0 0 12px">Mã xác thực của bạn là:</p>
          <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700">${otp}</p>
          <p style="margin:0 0 8px">Mã này sẽ hết hạn sau ${expiresInMinutes} minute(s).</p>
          <p style="margin:0;color:#666">Nếu bạn không yêu cầu thao tác này, bạn có thể bỏ qua email này.</p>
        </div>
      `,
    });
  }

  private async assertOtpResendNotInCooldown(email: string): Promise<void> {
    const resendKey = this.getCustomerOtpResendKey(email);
    const cooldownTtl = await this.redis.getClient().ttl(resendKey);
    if (cooldownTtl > 0) {
      throw new HttpException(
        `Vui lòng chờ ${cooldownTtl} giây trước khi yêu cầu OTP mới.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async incrementFailedOtpAttempt(attemptsKey: string, otpKey: string): Promise<number> {
    const redis = this.redis.getClient();
    const attempts = await redis.incr(attemptsKey);
    if (attempts === 1) {
      const ttlMs = await redis.pttl(otpKey);
      if (ttlMs > 0) {
        const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
        await redis.expire(attemptsKey, ttlSeconds);
      }
    }
    return attempts;
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

  private generateOtpCode(length: number): string {
    const max = 10 ** length;
    return randomInt(0, max).toString().padStart(length, '0');
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private hasMatchingHash(storedHash: string, incomingHash: string): boolean {
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const incomingBuffer = Buffer.from(incomingHash, 'hex');
    if (storedBuffer.length === 0 || incomingBuffer.length === 0) return false;
    if (storedBuffer.length !== incomingBuffer.length) return false;
    return timingSafeEqual(storedBuffer, incomingBuffer);
  }

  private parseCustomerOtpPayload(raw: string): CustomerOtpPayload | null {
    try {
      const payload: unknown = JSON.parse(raw);
      if (typeof payload !== 'object' || payload === null) return null;
      const record = payload as Record<string, unknown>;
      const customerId = record.customerId;
      const otpHash = record.otpHash;
      if (
        typeof customerId === 'number' &&
        Number.isInteger(customerId) &&
        customerId > 0 &&
        typeof otpHash === 'string' &&
        otpHash.length > 0
      ) {
        return { customerId, otpHash };
      }
      return null;
    } catch {
      return null;
    }
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
      if (this.isUniqueConstraintError(error)) {
        const targets = this.extractConstraintTargets(error.meta?.target);
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

  private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
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
