import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatAdminController } from './controllers/chat-admin.controller';
import { ChatCustomerController } from './controllers/chat-customer.controller';
import { ChatGuestController } from './controllers/chat-guest.controller';
import { SupportChatGateway } from './gateway/support-chat.gateway';
import { SupportChatRepository } from './repositories/support-chat.repository';
import { GuestSessionService } from './services/guest-session.service';
import { SupportChatService } from './services/support-chat.service';
import { WsCombinedAuthGuard } from './ws-combined-auth.guard';
import { WsGuestGuard } from './ws-guest.guard';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChatCustomerController, ChatAdminController, ChatGuestController],
  providers: [
    SupportChatService,
    GuestSessionService,
    SupportChatRepository,
    SupportChatGateway,
    WsJwtGuard,
    WsGuestGuard,
    WsCombinedAuthGuard,
  ],
})
export class SupportChatModule {}
