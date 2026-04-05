import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AddressModule } from './address/address.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttributeModule } from './attribute/attribute.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ColorModule } from './color/color.module';
import { CommonModule } from './common/common.module';
import { CoreModule } from './core/core.module';
import { CustomerModule } from './customer/customer.module';
import { EmployeeModule } from './employee/employee.module';
import { LocationModule } from './location/location.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { ProfileModule } from './profile/profile.module';
import { RbacModule } from './rbac/rbac.module';
import { RedisModule } from './redis/redis.module';
import { SizeModule } from './size/size.module';

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
    ColorModule,
    SizeModule,
    AttributeModule,
    ProductModule,
    CustomerModule,
    EmployeeModule,
    RbacModule,
    LocationModule,
    AddressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
