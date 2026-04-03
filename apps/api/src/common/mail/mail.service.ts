import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { parseBoolean } from '../utils/config.util';

interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly sender: string | null;
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    this.sender = this.config.get<string>('SMTP_FROM') ?? null;
    this.transporter = this.buildTransporter();
  }

  /** Returns true when a real SMTP transport is configured. */
  isConfigured(): boolean {
    return this.transporter !== null && this.sender !== null;
  }

  /**
   * Send an email. Falls back to logging when SMTP is not configured
   * (useful for local development).
   */
  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter || !this.sender) {
      this.logger.warn('SMTP is not configured. Email is logged for local development only.');
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

  private buildTransporter(): Transporter | null {
    const host = this.config.get<string>('SMTP_HOST') ?? null;
    const rawPort = Number(this.config.get<string | number>('SMTP_PORT') ?? 587);
    const port = Number.isInteger(rawPort) && rawPort > 0 ? rawPort : 587;
    const configuredSecure = parseBoolean(this.config.get<string>('SMTP_SECURE'), false);
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
