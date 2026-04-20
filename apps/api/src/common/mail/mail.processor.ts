import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MAIL_QUEUE } from './mail.constants';
import { MailService } from './mail.service';

export interface SendMailJobData {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Processor xử lý các công việc (jobs) trong hàng đợi gửi mail (MAIL_QUEUE).
 * Chạy ngầm để không làm gián đoạn luồng xử lý chính của request.
 */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  /**
   * Phương thức thực thi logic xử lý từng job gửi mail.
   * Lấy dữ liệu từ job và gọi MailService để gửi mail trực tiếp.
   */
  async process(job: Job<SendMailJobData>): Promise<void> {
    this.logger.log(`Processing mail job ${job.id} to=${job.data.to}`);
    await this.mail.sendMailDirect(job.data);
  }
}
