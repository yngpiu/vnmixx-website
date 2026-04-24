import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { RedisService } from '../../redis/services/redis.service';

export interface OtpPayload {
  customerId: number;
  otpHash: string;
}

@Injectable()
// Service tiện ích quản lý mã OTP (One-Time Password).
// Cung cấp các phương thức dùng chung để tạo, băm (hash), kiểm tra khớp mã,
// và quản lý lượt thử sai/thời gian chờ (cooldown) sử dụng Redis.
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly redis: RedisService) {}

  // Tạo mã số ngẫu nhiên với độ dài chỉ định (ví dụ: 6 chữ số).
  generateOtpCode(length: number): string {
    const max = 10 ** length;
    return randomInt(0, max).toString().padStart(length, '0');
  }

  // Băm mã OTP bằng thuật toán SHA-256 để lưu trữ an toàn.
  hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  // So sánh mã băm (hash) một cách an toàn để tránh tấn công timing attack.
  hasMatchingHash(storedHash: string, incomingHash: string): boolean {
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const incomingBuffer = Buffer.from(incomingHash, 'hex');
    if (storedBuffer.length === 0 || incomingBuffer.length === 0) return false;
    if (storedBuffer.length !== incomingBuffer.length) return false;
    return timingSafeEqual(storedBuffer, incomingBuffer);
  }

  // Chuyển đổi dữ liệu thô từ Redis sang object OtpPayload.
  parseOtpPayload(raw: string): OtpPayload | null {
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

  // Tăng số lượt nhập sai OTP và đặt thời gian hết hạn cho khóa đếm lượt thử.
  async incrementFailedAttempt(attemptsKey: string, otpKey: string): Promise<number> {
    const redis = this.redis.getClient();
    // 1. Tăng giá trị đếm lượt thử sai trong Redis
    const attempts = await redis.incr(attemptsKey);
    // 2. Nếu là lần thử sai đầu tiên, đặt thời gian hết hạn (TTL) cho khóa đếm dựa trên TTL của mã OTP hiện tại
    if (attempts === 1) {
      const ttlMs = await redis.pttl(otpKey);
      if (ttlMs > 0) {
        const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
        await redis.expire(attemptsKey, ttlSeconds);
      }
    }
    return attempts;
  }

  // Kiểm tra xem người dùng có đang trong thời gian chờ (cooldown) trước khi được gửi lại mã mới hay không.
  async assertResendNotInCooldown(resendKey: string): Promise<void> {
    const cooldownTtl = await this.redis.getClient().ttl(resendKey);
    if (cooldownTtl > 0) {
      throw new HttpException(
        `Vui lòng chờ ${cooldownTtl} giây trước khi yêu cầu mã mới.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // Quy trình cấp OTP:
  // 1. Tạo OTP ngẫu nhiên -> 2. Lưu hash vào Redis -> 3. Gọi hàm gửi OTP (email) -> 4. Thiết lập cooldown.
  async issueOtp(params: {
    otpKey: string;
    attemptsKey: string;
    resendKey: string;
    customerId: number;
    otpLength: number;
    expirationSeconds: number;
    cooldownSeconds: number;
    sendFn: (otp: string) => Promise<void>;
  }): Promise<{ otpExpiresIn: number; resendAfter: number }> {
    const redis = this.redis.getClient();
    // 1. Tạo mã OTP mới và chuẩn bị dữ liệu băm để lưu trữ
    const otp = this.generateOtpCode(params.otpLength);
    const otpPayload: OtpPayload = { customerId: params.customerId, otpHash: this.hashOtp(otp) };

    // 2. Lưu mã OTP vào Redis và xóa bỏ bộ đếm lượt thử sai cũ (dùng transaction để đảm bảo tính nguyên tử)
    await redis
      .multi()
      .setex(params.otpKey, params.expirationSeconds, JSON.stringify(otpPayload))
      .del(params.attemptsKey)
      .exec();

    try {
      // 3. Thực hiện gửi mã OTP qua phương thức được cung cấp (ví dụ: Email)
      await params.sendFn(otp);
    } catch (error) {
      this.logger.error(
        `Failed to send OTP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // 4. Nếu gửi thất bại, dọn dẹp dữ liệu OTP trong Redis để tránh trạng thái không đồng nhất
      await redis.del(params.otpKey, params.attemptsKey);
      throw new InternalServerErrorException('Không thể gửi email mã xác thực. Vui lòng thử lại.');
    }

    // 5. Thiết lập thời gian chờ (cooldown) để ngăn chặn spam yêu cầu OTP
    await redis.setex(params.resendKey, params.cooldownSeconds, '1');
    return {
      otpExpiresIn: params.expirationSeconds,
      resendAfter: params.cooldownSeconds,
    };
  }
}
