import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { AddressModule } from './address/address.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CategoryModule } from './category/category.module';
import { ColorModule } from './color/color.module';
import { CommonModule } from './common/common.module';
import { CoreModule } from './core/core.module';
import { CustomerModule } from './customer/customer.module';
import { EmployeeModule } from './employee/employee.module';
import { LocationModule } from './location/location.module';
import { MediaModule } from './media/media.module';
import { OrderModule } from './order/order.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { ProfileModule } from './profile/profile.module';
import { R2Module } from './r2/r2.module';
import { RbacModule } from './rbac/rbac.module';
import { RedisModule } from './redis/redis.module';
import { ThrottlerStorageRedis } from './redis/throttler-storage-redis';
import { ShippingModule } from './shipping/shipping.module';
import { SizeModule } from './size/size.module';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB) || 0,
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    CoreModule,
    PrismaModule,
    RedisModule,
    CommonModule,
    AuditLogModule,
    AuthModule,
    CartModule,
    ProfileModule,
    CategoryModule,
    ColorModule,
    SizeModule,
    ProductModule,
    CustomerModule,
    EmployeeModule,
    RbacModule,
    LocationModule,
    AddressModule,
    ShippingModule,
    WishlistModule,
    OrderModule,
    AnalyticsModule,
    R2Module,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: ThrottlerStorage, useClass: ThrottlerStorageRedis },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
