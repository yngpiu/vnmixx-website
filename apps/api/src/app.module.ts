import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { AddressModule } from './address/address.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CategoryModule } from './category/category.module';
import { ColorModule } from './color/color.module';
import { validateEnv } from './common/config/env.validation';
import { CoreModule } from './core/core.module';
import { CustomerModule } from './customer/customer.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EmployeeModule } from './employee/employee.module';
import { InventoryModule } from './inventory/inventory.module';
import { LocationModule } from './location/location.module';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { ProfileModule } from './profile/profile.module';
import { R2Module } from './r2/r2.module';
import { RbacModule } from './rbac/rbac.module';
import { ThrottlerStorageRedis } from './redis/redis-throttler.storage';
import { RedisModule } from './redis/redis.module';
import { ReviewModule } from './review/review.module';
import { ShippingModule } from './shipping/shipping.module';
import { SizeModule } from './size/size.module';
import { SupportChatModule } from './support-chat/support-chat.module';
import { WishlistModule } from './wishlist/wishlist.module';

// Module gốc dùng để ghép cấu hình và toàn bộ module nghiệp vụ.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          username: config.get<string>('REDIS_USERNAME') || undefined,
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: config.get<number>('REDIS_DB'),
        },
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    CoreModule,
    PrismaModule,
    RedisModule,
    MailModule,
    AuditLogModule,
    AuthModule,
    CartModule,
    ProfileModule,
    CategoryModule,
    ColorModule,
    SizeModule,
    ProductModule,
    CustomerModule,
    DashboardModule,
    InventoryModule,
    EmployeeModule,
    RbacModule,
    LocationModule,
    AddressModule,
    ShippingModule,
    WishlistModule,
    OrderModule,
    ReviewModule,
    R2Module,
    MediaModule,
    SupportChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: ThrottlerStorage, useClass: ThrottlerStorageRedis },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
