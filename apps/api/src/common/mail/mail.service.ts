import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
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

  /** Returns true when a real SMTP transport is configured. */
  isConfigured(): boolean {
    return this.transporter !== null && this.sender !== null;
  }

  /** Render a template and enqueue an email. */
  async sendMailWithTemplate(
    to: string,
    templateKey: keyof typeof MAIL_TEMPLATES,
    context: Record<string, unknown>,
  ): Promise<void> {
    const { subject, html, text } = renderTemplate(templateKey, context);
    return this.sendMail({ to, subject, html, text });
  }

  /**
   * Enqueue an email to be sent asynchronously via BullMQ.
   * Falls back to logging in dev mode (no SMTP configured).
   */
  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.isConfigured()) {
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
   * Send an email directly (called by the queue processor).
   * Should not be used outside of MailProcessor.
   */
  async sendMailDirect(options: SendMailOptions): Promise<void> {
    if (!this.transporter || !this.sender) {
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
