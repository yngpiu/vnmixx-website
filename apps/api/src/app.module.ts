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
import { CommonModule } from './common/common.module';
import { validateEnv } from './config/env.validation';
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
import { ThrottlerStorageRedis } from './redis/redis-throttler.storage';
import { RedisModule } from './redis/redis.module';
import { ReviewModule } from './review/review.module';
import { ShippingModule } from './shipping/shipping.module';
import { SizeModule } from './size/size.module';
import { WishlistModule } from './wishlist/wishlist.module';

/**
 * Module gốc (Root Module) của ứng dụng.
 * Chịu trách nhiệm khởi tạo cấu hình toàn cục, kết nối cơ sở dữ liệu (Prisma, Redis),
 * và đăng ký tất cả các Module chức năng trong hệ thống.
 */
@Module({
  imports: [
    // Cấu hình biến môi trường toàn cục và validate dữ liệu đầu vào
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Cấu hình hàng đợi (Queue) sử dụng Redis thông qua BullMQ
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
    // Cấu hình giới hạn tần suất yêu cầu (Rate Limiting)
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
    }),
    // Đăng ký các Module nền tảng (Core, Database, Cache)
    CoreModule,
    PrismaModule,
    RedisModule,
    CommonModule,
    // Đăng ký các Module chức năng nghiệp vụ
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
    ReviewModule,
    R2Module,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Sử dụng Redis để lưu trữ dữ liệu giới hạn tần suất (Rate Limit)
    { provide: ThrottlerStorage, useClass: ThrottlerStorageRedis },
    // Áp dụng Rate Limit cho toàn bộ ứng dụng
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
