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
import { CustomerStatus } from '../../../generated/prisma/client';
import { ERROR_CODES } from '../../common/constants/error-codes';
import {
  getPrismaErrorTargets,
  isPrismaErrorCode,
  isPrismaKnownRequestError,
} from '../../common/utils/prisma.util';
import { MailService } from '../../mail/services/mail.service';
import { RedisService } from '../../redis/services/redis.service';
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
// Service xử lý logic xác thực cho Khách hàng (Customer).
// Bao gồm các quy trình: Đăng ký tài khoản, Xác thực mã OTP qua email, Đăng nhập, và Đổi mật khẩu.
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);
  private readonly saltRounds: number;
  private readonly otpExpiration: number;
  private readonly otpResendCooldown: number;
  private readonly otpMaxAttempts: number;
  private static readonly phoneRegex = /^(03[2-9]|05[6|8|9]|07[0|6-9]|08[1-9]|09[0-9])[0-9]{7}$/;

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

  private isPhoneNumberIdentifier(identifier: string): boolean {
    return CustomerAuthService.phoneRegex.test(identifier);
  }

  // Đăng ký khách hàng mới.
  // Logic: Kiểm tra email/SĐT duy nhất -> Hash mật khẩu -> Lưu database (trạng thái chưa kích hoạt) -> Gửi OTP xác thực qua email.
  async registerCustomer(dto: RegisterDto): Promise<CustomerRegisterResponseDto> {
    // 1. Kiểm tra xem email đã được sử dụng chưa để tránh trùng lặp
    await this.assertCustomerEmailNotTaken(dto.email);
    // 2. Kiểm tra xem số điện thoại đã được sử dụng chưa
    await this.assertCustomerPhoneNotTaken(dto.phoneNumber);
    // 3. Hash mật khẩu để đảm bảo an toàn thông tin người dùng
    const hashedPassword = await hash(dto.password, this.saltRounds);
    const dob = parseDob(dto.dob);
    // 4. Tạo thông tin khách hàng trong cơ sở dữ liệu với trạng thái chưa kích hoạt
    const customer = await this.createCustomerOrThrowConflict({
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      hashedPassword,
      dob,
      gender: dto.gender ?? null,
      status: CustomerStatus.PENDING_VERIFICATION,
    });
    // 5. Cấp mã OTP và gửi email xác thực để hoàn tất đăng ký
    const otpMeta = await this.issueVerificationOtp(customer.id, customer.email);
    return {
      message: 'Đăng ký thành công. Vui lòng xác thực email bằng mã OTP đã gửi.',
      email: customer.email,
      ...otpMeta,
    };
  }

  // Xác thực mã OTP email của khách hàng.
  // Logic: Kiểm tra OTP trong Redis -> So khớp mã băm -> Kích hoạt tài khoản trong DB -> Xóa OTP đã sử dụng.
  async verifyCustomerOtp(dto: VerifyCustomerOtpDto): Promise<CustomerAuthIdentity> {
    // 1. Tìm thông tin khách hàng theo email
    const customer = await this.customerRepo.findByEmail(dto.email);
    if (!customer || customer.deletedAt) {
      throw new BadRequestException('Yêu cầu xác thực không hợp lệ');
    }
    // 2. Kiểm tra nếu email đã được xác thực trước đó
    if (customer.emailVerifiedAt) {
      if (customer.status !== CustomerStatus.ACTIVE) {
        throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      }
      throw new BadRequestException('Email đã được xác thực');
    }
    const otpKey = this.getCustomerOtpKey(dto.email);
    const attemptsKey = this.getCustomerOtpAttemptsKey(dto.email);
    // 3. Lấy dữ liệu OTP từ Redis để kiểm tra tính hợp lệ và thời hạn
    const otpPayloadRaw = await this.redis.getClient().get(otpKey);
    if (!otpPayloadRaw) {
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    const payload = this.otpService.parseOtpPayload(otpPayloadRaw);
    if (!payload || payload.customerId !== customer.id) {
      await this.redis.getClient().del(otpKey, attemptsKey);
      throw new BadRequestException('OTP không hợp lệ hoặc đã hết hạn');
    }
    // 4. So khớp mã OTP người dùng nhập vào với mã băm lưu trong Redis
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
    // 5. Cập nhật trạng thái kích hoạt tài khoản trong cơ sở dữ liệu
    const activated = await this.customerRepo.activateEmailById(customer.id);
    if (!activated) throw new BadRequestException('Không thể xác thực tài khoản này');
    // 6. Xóa bỏ OTP và các khóa liên quan trong Redis sau khi xác thực thành công
    await this.redis.getClient().del(otpKey, attemptsKey, this.getCustomerOtpResendKey(dto.email));
    return { id: customer.id, email: customer.email, fullName: customer.fullName };
  }

  // Gửi lại mã OTP xác thực email.
  // Logic: Kiểm tra cooldown (thời gian chờ giữa các lần gửi) -> Tạo và gửi OTP mới qua email.
  async resendCustomerOtp(dto: ResendCustomerOtpDto): Promise<CustomerRegisterResponseDto> {
    // 1. Kiểm tra sự tồn tại của khách hàng
    const customer = await this.customerRepo.findByEmail(dto.email);
    if (!customer || customer.deletedAt) {
      throw new BadRequestException('Yêu cầu xác thực không hợp lệ');
    }
    // 2. Đảm bảo email chưa được xác thực
    if (customer.emailVerifiedAt) {
      if (customer.status !== CustomerStatus.ACTIVE) {
        throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
      }
      throw new BadRequestException('Email đã được xác thực');
    }
    // 3. Kiểm tra thời gian chờ để ngăn chặn việc gửi lại quá thường xuyên
    await this.otpService.assertResendNotInCooldown(this.getCustomerOtpResendKey(dto.email));
    // 4. Tạo và gửi mã OTP mới
    const otpMeta = await this.issueVerificationOtp(customer.id, customer.email);
    return {
      message: 'Mã OTP mới đã được gửi tới email của bạn.',
      email: customer.email,
      ...otpMeta,
    };
  }

  // Đăng nhập khách hàng.
  // Logic: Tìm theo email/phone -> Kiểm tra trạng thái tài khoản (Active/Verified) -> So sánh mật khẩu băm.
  async loginCustomer(dto: LoginDto): Promise<CustomerAuthIdentity> {
    const identifier = dto.emailOrPhone;

    // 1. Tìm thông tin khách hàng dựa trên email hoặc số điện thoại
    const customer = this.isPhoneNumberIdentifier(identifier)
      ? await this.findCustomerByPhone(identifier)
      : await this.customerRepo.findByEmail(identifier);
    if (!customer || customer.deletedAt) {
      throw new UnauthorizedException('Email hoặc số điện thoại hoặc mật khẩu không hợp lệ');
    }
    // 2. So sánh mật khẩu nhập vào với mật khẩu băm lưu trong DB để xác thực
    const isPasswordValid = await compare(dto.password, customer.hashedPassword);
    if (!isPasswordValid) {
      // Sai mật khẩu thì luôn trả về lỗi chung, kể cả với tài khoản chưa xác thực.
      throw new UnauthorizedException('Email hoặc số điện thoại hoặc mật khẩu không hợp lệ');
    }
    // 3. Kiểm tra trạng thái kích hoạt và xác thực của tài khoản
    if (customer.status === CustomerStatus.PENDING_VERIFICATION || !customer.emailVerifiedAt) {
      // Đúng mật khẩu nhưng email chưa được xác thực -> dùng code riêng để frontend chuyển sang verify OTP.
      throw new UnauthorizedException({
        message: 'Email chưa được xác thực',
        code: ERROR_CODES.AUTH_EMAIL_UNVERIFIED,
        meta: { email: customer.email },
      });
    }
    if (customer.status !== CustomerStatus.ACTIVE) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }
    return { id: customer.id, email: customer.email, fullName: customer.fullName };
  }

  private async findCustomerByPhone(
    phoneNumber: string,
  ): Promise<ReturnType<CustomerRepository['findByPhone']>> {
    const normalized = phoneNumber.trim();
    return this.customerRepo.findByPhone(normalized);
  }

  // Đổi mật khẩu cho khách hàng đã đăng nhập.
  // Logic: Xác thực mật khẩu cũ -> Hash mật khẩu mới -> Cập nhật database.
  async changePassword(
    customerId: number,
    dto: { currentPassword?: string; newPassword?: string },
  ): Promise<void> {
    // 1. Lấy mật khẩu băm hiện tại để xác thực
    const currentHash = await this.customerRepo.findHashedPasswordById(customerId);
    if (!currentHash) throw new BadRequestException('Không tìm thấy khách hàng');

    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('Cần cung cấp mật khẩu cũ và mật khẩu mới');
    }

    // 2. So khớp mật khẩu cũ
    const isCurrentPasswordValid = await compare(dto.currentPassword, currentHash);
    if (!isCurrentPasswordValid)
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');

    // 3. Hash mật khẩu mới và cập nhật vào cơ sở dữ liệu
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
    status?: CustomerStatus;
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
