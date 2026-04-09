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

@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<SendMailJobData>): Promise<void> {
    this.logger.log(`Processing mail job ${job.id} to=${job.data.to}`);
    await this.mail.sendMailDirect(job.data);
  }
}
