import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { MAIL_QUEUE } from '../mail.constants';
import { MAIL_TEMPLATES, renderTemplate } from '../mail.templates';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Quản lý luồng render template, enqueue và gửi email qua SMTP.
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

  // Kiểm tra SMTP và sender đã đủ điều kiện để gửi mail thực tế.
  isConfigured(): boolean {
    return this.transporter !== null && this.sender !== null;
  }

  // Render template theo context rồi đẩy vào luồng gửi mail.
  async sendMailWithTemplate(
    to: string,
    templateKey: keyof typeof MAIL_TEMPLATES,
    context: Record<string, unknown>,
  ): Promise<void> {
    const rendered = renderTemplate(templateKey, context);
    return this.sendMail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // Đưa email vào queue để gửi bất đồng bộ và retry khi lỗi tạm thời.
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

  // Gửi email trực tiếp qua transporter (được gọi từ worker).
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

  // Tạo nodemailer transporter từ cấu hình SMTP trong env.
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
