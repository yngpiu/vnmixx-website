import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { RedisModule } from '../redis/redis.module';
import { AdminShopContentController } from './controllers/admin-shop-content.controller';
import { ChatAdminController } from './controllers/chat-admin.controller';
import { ChatCustomerController } from './controllers/chat-customer.controller';
import { ChatGuestController } from './controllers/chat-guest.controller';
import { SupportChatGateway } from './gateway/support-chat.gateway';
import { SupportChatAiProcessor } from './processors/support-chat-ai.processor';
import { ShopContentRepository } from './repositories/shop-content.repository';
import { SupportChatRepository } from './repositories/support-chat.repository';
import { CatalogAiSearchService } from './services/catalog-ai-search.service';
import { CohereService } from './services/cohere.service';
import { GuestSessionService } from './services/guest-session.service';
import { PolicyAiSearchService } from './services/policy-ai-search.service';
import { SupportChatService } from './services/support-chat.service';
import { SUPPORT_CHAT_AI_QUEUE } from './support-chat.constants';
import { WsCombinedAuthGuard } from './ws-combined-auth.guard';
import { WsGuestGuard } from './ws-guest.guard';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProductModule,
    RedisModule,
    BullModule.registerQueue({ name: SUPPORT_CHAT_AI_QUEUE }),
  ],
  controllers: [
    ChatCustomerController,
    ChatAdminController,
    ChatGuestController,
    AdminShopContentController,
  ],
  providers: [
    SupportChatService,
    GuestSessionService,
    ShopContentRepository,
    SupportChatRepository,
    SupportChatGateway,
    WsJwtGuard,
    WsGuestGuard,
    WsCombinedAuthGuard,
    // AI
    CohereService,
    CatalogAiSearchService,
    PolicyAiSearchService,
    SupportChatAiProcessor,
  ],
})
export class SupportChatModule {}
