import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatAdminController } from './controllers/chat-admin.controller';
import { ChatCustomerController } from './controllers/chat-customer.controller';
import { SupportChatGateway } from './gateway/support-chat.gateway';
import { SupportChatRepository } from './repositories/support-chat.repository';
import { SupportChatService } from './services/support-chat.service';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChatCustomerController, ChatAdminController],
  providers: [SupportChatService, SupportChatRepository, SupportChatGateway, WsJwtGuard],
})
export class SupportChatModule {}
