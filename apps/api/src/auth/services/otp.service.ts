import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { RedisService } from '../../redis/redis.service';

export interface OtpPayload {
  customerId: number;
  otpHash: string;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly redis: RedisService) {}

  generateOtpCode(length: number): string {
    const max = 10 ** length;
    return randomInt(0, max).toString().padStart(length, '0');
  }

  hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  hasMatchingHash(storedHash: string, incomingHash: string): boolean {
    const storedBuffer = Buffer.from(storedHash, 'hex');
    const incomingBuffer = Buffer.from(incomingHash, 'hex');
    if (storedBuffer.length === 0 || incomingBuffer.length === 0) return false;
    if (storedBuffer.length !== incomingBuffer.length) return false;
    return timingSafeEqual(storedBuffer, incomingBuffer);
  }

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

  async incrementFailedAttempt(attemptsKey: string, otpKey: string): Promise<number> {
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

  async assertResendNotInCooldown(resendKey: string): Promise<void> {
    const cooldownTtl = await this.redis.getClient().ttl(resendKey);
    if (cooldownTtl > 0) {
      throw new HttpException(
        `Vui lòng chờ ${cooldownTtl} giây trước khi yêu cầu mã mới.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

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
    const otp = this.generateOtpCode(params.otpLength);
    const otpPayload: OtpPayload = { customerId: params.customerId, otpHash: this.hashOtp(otp) };

    await redis
      .multi()
      .setex(params.otpKey, params.expirationSeconds, JSON.stringify(otpPayload))
      .del(params.attemptsKey)
      .exec();

    try {
      await params.sendFn(otp);
    } catch (error) {
      this.logger.error(
        `Failed to send OTP: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      await redis.del(params.otpKey, params.attemptsKey);
      throw new InternalServerErrorException('Không thể gửi email mã xác thực. Vui lòng thử lại.');
    }

    await redis.setex(params.resendKey, params.cooldownSeconds, '1');
    return {
      otpExpiresIn: params.expirationSeconds,
      resendAfter: params.cooldownSeconds,
    };
  }
}
