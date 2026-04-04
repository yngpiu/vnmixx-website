import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { CommonModule } from './common/common.module';
import { CoreModule } from './core/core.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { RbacModule } from './rbac/rbac.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CoreModule,
    PrismaModule,
    RedisModule,
    CommonModule,
    AuthModule,
    ProfileModule,
    CategoryModule,
    RbacModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
