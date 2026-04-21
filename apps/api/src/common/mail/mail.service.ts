import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { MAIL_TEMPLATES, renderTemplate } from './mail-templates';
import { MAIL_QUEUE } from './mail.constants';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Service xử lý logic gửi email trong ứng dụng.
 * Hỗ trợ gửi mail qua SMTP và hàng đợi (queue) BullMQ để xử lý bất đồng bộ.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly sender: string | null;
  private readonly transporter: Transporter | null;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {
    this.sender = this.config.get<string>('SMTP_FROM') ?? null;
    this.transporter = this.buildTransporter();
  }

  /**
   * Kiểm tra xem cấu hình SMTP đã sẵn sàng để gửi mail thật chưa.
   */
  isConfigured(): boolean {
    return this.transporter !== null && this.sender !== null;
  }

  /**
   * Render nội dung email từ template và đưa vào hàng đợi để gửi đi.
   */
  async sendMailWithTemplate(
    to: string,
    templateKey: keyof typeof MAIL_TEMPLATES,
    context: Record<string, unknown>,
  ): Promise<void> {
    const { subject, html, text } = renderTemplate(templateKey, context);
    return this.sendMail({ to, subject, html, text });
  }

  /**
   * Thêm email vào hàng đợi BullMQ để gửi bất đồng bộ.
   * Nếu không có cấu hình SMTP, email sẽ chỉ được ghi log (dùng cho môi trường dev).
   */
  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Dịch vụ email chưa được cấu hình.');
      }
      this.logger.warn(
        'SMTP chưa được cấu hình. Email sẽ chỉ được ghi log cho môi trường phát triển cục bộ.',
      );
      this.logger.log(`[MAIL DEV] to=${options.to} subject=${options.subject}`);
      return;
    }
    await this.mailQueue.add('send', options, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: true,
      removeOnFail: 50,
    });
  }

  /**
   * Phương thức gửi mail trực tiếp qua transporter.
   * Được gọi bởi MailProcessor khi xử lý job từ hàng đợi.
   */
  async sendMailDirect(options: SendMailOptions): Promise<void> {
    if (!this.transporter || !this.sender) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Dịch vụ email chưa được cấu hình.');
      }
      this.logger.warn(
        'SMTP chưa được cấu hình. Email sẽ chỉ được ghi log cho môi trường phát triển cục bộ.',
      );
      this.logger.log(`[MAIL DEV] to=${options.to} subject=${options.subject}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.sender,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  /**
   * Khởi tạo đối tượng Transporter của nodemailer dựa trên cấu hình môi trường.
   */
  private buildTransporter(): Transporter | null {
    const host = this.config.get<string>('SMTP_HOST') ?? null;
    const rawPort = Number(this.config.get<string | number>('SMTP_PORT') ?? 587);
    const port = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 587;
    const rawSecure = this.config.get<string>('SMTP_SECURE')?.trim().toLowerCase();
    const configuredSecure = rawSecure === 'true' || rawSecure === '1';
    const secure = port === 465 ? true : configuredSecure;

    if (port === 465 && !configuredSecure) {
      this.logger.warn(
        'SMTP_PORT=465 requires implicit TLS. Overriding SMTP_SECURE=false to true.',
      );
    }

    if (!host || !this.sender) return null;

    if (!Number.isInteger(port) || port <= 0) {
      this.logger.warn('SMTP_PORT is invalid. Falling back to email log mode.');
      return null;
    }

    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const auth = user && pass ? { user, pass } : undefined;
    return nodemailer.createTransport({ host, port, secure, auth });
  }
}
