import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { hash } from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { CustomerStatus } from '../../../generated/prisma/client';
import { MailService } from '../../mail/services/mail.service';
import { RedisService } from '../../redis/services/redis.service';
import {
  BCRYPT_SALT_ROUNDS,
  CUSTOMER_OTP_LENGTH,
  CUSTOMER_RESET_OTP_ATTEMPTS_PREFIX,
  CUSTOMER_RESET_OTP_PREFIX,
  CUSTOMER_RESET_OTP_RESEND_PREFIX,
  CUSTOMER_RESET_TOKEN_PREFIX,
  DEFAULT_OTP_EXPIRATION,
  DEFAULT_OTP_MAX_ATTEMPTS,
  DEFAULT_OTP_RESEND_COOLDOWN,
  DEFAULT_RESET_TOKEN_EXPIRATION,
} from '../constants';
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  ForgotPasswordVerifyOtpDto,
  ResetPasswordDto,
  ResetTokenResponseDto,
} from '../dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { OtpService } from './otp.service';

@Injectable()
/**
 * Service xử lý quy trình quên mật khẩu và khôi phục mật khẩu (Password Reset).
 * Quy trình gồm 3 bước chính:
 * 1. Yêu cầu mã OTP khôi phục qua email.
 * 2. Xác thực OTP để nhận mã đặt lại (Reset Token) dùng một lần.
 * 3. Sử dụng mã đặt lại để cập nhật mật khẩu mới.
 */
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly saltRounds = BCRYPT_SALT_ROUNDS;

  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Bước 1: Yêu cầu mã OTP khôi phục mật khẩu.
   * Logic: Kiểm tra email hợp lệ -> Tạo và gửi OTP khôi phục qua email.
   */
  async requestPasswordReset(dto: ForgotPasswordDto): Promise<ForgotPasswordResponseDto> {
    const customer = await this.customerRepo.findByEmail(dto.email);

    if (
      !customer ||
      customer.deletedAt ||
      customer.status !== CustomerStatus.ACTIVE ||
      !customer.emailVerifiedAt
    ) {
      return {
        message: 'Nếu email đã đăng ký và đã xác thực, mã đặt lại đã được gửi.',
        email: dto.email,
        otpExpiresIn: DEFAULT_OTP_EXPIRATION,
        resendAfter: DEFAULT_OTP_RESEND_COOLDOWN,
      };
    }

    const resendKey = this.getResetOtpResendKey(dto.email);
    await this.otpService.assertResendNotInCooldown(resendKey);

    const otpMeta = await this.otpService.issueOtp({
      customerId: customer.id,
      otpKey: this.getResetOtpKey(dto.email),
      attemptsKey: this.getResetOtpAttemptsKey(dto.email),
      resendKey,
      otpLength: CUSTOMER_OTP_LENGTH,
      expirationSeconds: DEFAULT_OTP_EXPIRATION,
      cooldownSeconds: DEFAULT_OTP_RESEND_COOLDOWN,
      sendFn: (otp) =>
        this.mail.sendMailWithTemplate(customer.email, 'PASSWORD_RESET_OTP', {
          otp,
          expiresInMinutes: Math.ceil(DEFAULT_OTP_EXPIRATION / 60),
        }),
    });

    return {
      message: 'Mã đặt lại mật khẩu đã được gửi tới email của bạn.',
      email: customer.email,
      ...otpMeta,
    };
  }

  /**
   * Bước 2: Xác thực OTP và cấp mã đặt lại (Reset Token).
   * Logic: So khớp OTP -> Nếu đúng, tạo UUID làm Reset Token -> Lưu hash Reset Token vào Redis.
   */
  async verifyPasswordResetOtp(dto: ForgotPasswordVerifyOtpDto): Promise<ResetTokenResponseDto> {
    const customer = await this.customerRepo.findByEmail(dto.email);

    if (
      !customer ||
      customer.deletedAt ||
      customer.status !== CustomerStatus.ACTIVE ||
      !customer.emailVerifiedAt
    ) {
      throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
    }

    const otpKey = this.getResetOtpKey(dto.email);
    const attemptsKey = this.getResetOtpAttemptsKey(dto.email);
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
      if (attempts >= DEFAULT_OTP_MAX_ATTEMPTS) {
        throw new HttpException(
          'Bạn đã nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã đặt lại mới.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadRequestException('OTP không chính xác');
    }

    const resetToken = randomUUID();
    const resetTokenHash = createHash('sha256').update(resetToken).digest('hex');
    const resetKey = this.getResetTokenKey(dto.email);

    await this.redis.getClient().setex(resetKey, DEFAULT_RESET_TOKEN_EXPIRATION, resetTokenHash);
    await this.redis.getClient().del(otpKey, attemptsKey, this.getResetOtpResendKey(dto.email));

    return { resetToken };
  }

  /**
   * Bước 3: Đặt lại mật khẩu bằng Reset Token.
   * Logic: Kiểm tra Reset Token trong Redis -> So khớp mã băm -> Cập nhật mật khẩu mới vào DB -> Xóa token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ customerId: number }> {
    const customer = await this.customerRepo.findByEmail(dto.email);

    if (
      !customer ||
      customer.deletedAt ||
      customer.status !== CustomerStatus.ACTIVE ||
      !customer.emailVerifiedAt
    ) {
      throw new BadRequestException('Mã đặt lại không hợp lệ hoặc đã hết hạn');
    }

    const resetKey = this.getResetTokenKey(dto.email);
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
}
