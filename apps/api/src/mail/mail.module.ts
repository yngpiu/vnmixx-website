import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { MAIL_QUEUE } from './mail.constants';
import { MailProcessor } from './mail.processor';
import { MailService } from './services/mail.service';

// Cung cấp MailService toàn cục và đăng ký queue xử lý mail nền.
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: MAIL_QUEUE })],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
