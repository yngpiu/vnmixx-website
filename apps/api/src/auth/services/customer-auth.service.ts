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
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { Prisma } from 'generated/prisma/client';
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
  ChangePasswordDto,
  CustomerRegisterResponseDto,
  LoginDto,
  RegisterDto,
  ResendCustomerOtpDto,
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
      message: 'Registration successful. Please verify your email using the OTP sent.',
      email: customer.email,
      ...otpMeta,
    };
  }

  /** Verify customer email OTP and return authenticated user identity. */
  async verifyCustomerOtp(dto: VerifyCustomerOtpDto): Promise<CustomerAuthIdentity> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
    if (!customer || customer.deletedAt) {
      throw new BadRequestException('Invalid verification request');
    }
    if (customer.emailVerifiedAt) {
      if (!customer.isActive) throw new UnauthorizedException('Account is deactivated');
      throw new BadRequestException('Email is already verified');
    }
    const otpKey = this.getCustomerOtpKey(normalizedEmail);
    const attemptsKey = this.getCustomerOtpAttemptsKey(normalizedEmail);
    const otpPayloadRaw = await this.redis.getClient().get(otpKey);
    if (!otpPayloadRaw) {
      throw new BadRequestException('OTP is invalid or expired');
    }
    const payload = this.parseCustomerOtpPayload(otpPayloadRaw);
    if (!payload || payload.customerId !== customer.id) {
      await this.redis.getClient().del(otpKey, attemptsKey);
      throw new BadRequestException('OTP is invalid or expired');
    }
    const incomingOtpHash = this.hashOtp(dto.otp);
    if (!this.hasMatchingHash(payload.otpHash, incomingOtpHash)) {
      const attempts = await this.incrementFailedOtpAttempt(attemptsKey, otpKey);
      if (attempts >= this.otpMaxAttempts) {
        throw new HttpException(
          'Too many incorrect OTP attempts. Please request a new OTP.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException('OTP is incorrect');
    }
    const activated = await this.customerRepo.activateEmailById(customer.id);
    if (!activated) throw new BadRequestException('Unable to verify this account');
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
      throw new BadRequestException('Invalid verification request');
    }
    if (customer.emailVerifiedAt) {
      if (!customer.isActive) throw new UnauthorizedException('Account is deactivated');
      throw new BadRequestException('Email is already verified');
    }
    await this.assertOtpResendNotInCooldown(normalizedEmail);
    const otpMeta = await this.issueVerificationOtp(customer.id, customer.email);
    return { message: 'A new OTP has been sent to your email.', email: customer.email, ...otpMeta };
  }

  /** Authenticate an existing customer and return identity. */
  async loginCustomer(dto: LoginDto): Promise<CustomerAuthIdentity> {
    const normalizedEmail = normalizeEmail(dto.email);
    const customer = await this.customerRepo.findByEmail(normalizedEmail);
    if (!customer || customer.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!customer.isActive) {
      if (!customer.emailVerifiedAt) throw new UnauthorizedException('Email is not verified');
      throw new UnauthorizedException('Account is deactivated');
    }
    const isPasswordValid = await compare(dto.password, customer.hashedPassword);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');
    return { id: customer.id, email: customer.email, fullName: customer.fullName };
  }

  /** Change the password of an authenticated customer. */
  async changePassword(customerId: number, dto: ChangePasswordDto): Promise<void> {
    const currentHash = await this.customerRepo.findHashedPasswordById(customerId);
    if (!currentHash) throw new BadRequestException('Customer not found');

    const isCurrentPasswordValid = await compare(dto.currentPassword, currentHash);
    if (!isCurrentPasswordValid) throw new UnauthorizedException('Current password is incorrect');

    const newHashedPassword = await hash(dto.newPassword, this.saltRounds);
    const updated = await this.customerRepo.updatePassword(customerId, newHashedPassword);
    if (!updated) throw new BadRequestException('Unable to update password');
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
        `Failed to send OTP email to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await redis.del(otpKey, attemptsKey);
      throw new InternalServerErrorException('Unable to send OTP email. Please try again.');
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
      subject: 'VNMIXX - Email verification code',
      text:
        `Your VNMIXX verification code is: ${otp}\n\n` +
        `This code expires in ${expiresInMinutes} minute(s).\n` +
        'If you did not request this, you can ignore this email.',
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
          <h2 style="margin:0 0 12px">VNMIXX Email Verification</h2>
          <p style="margin:0 0 12px">Your verification code is:</p>
          <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700">${otp}</p>
          <p style="margin:0 0 8px">This code expires in ${expiresInMinutes} minute(s).</p>
          <p style="margin:0;color:#666">If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  }

  private async assertOtpResendNotInCooldown(email: string): Promise<void> {
    const resendKey = this.getCustomerOtpResendKey(email);
    const cooldownTtl = await this.redis.getClient().ttl(resendKey);
    if (cooldownTtl > 0) {
      throw new HttpException(
        `Please wait ${cooldownTtl} second(s) before requesting another OTP.`,
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
          throw new ConflictException('Email is already registered');
        }
        if (targets.some((target) => target.includes('phone'))) {
          throw new ConflictException('Phone number is already registered');
        }
        throw new ConflictException('Customer account already exists');
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
    if (isTaken) throw new ConflictException('Email is already registered');
  }

  private async assertCustomerPhoneNotTaken(phoneNumber: string): Promise<void> {
    const isTaken = await this.customerRepo.existsByPhone(phoneNumber);
    if (isTaken) throw new ConflictException('Phone number is already registered');
  }
}
