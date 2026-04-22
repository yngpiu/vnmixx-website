import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DEFAULT_ACCESS_EXPIRATION } from './constants';
import { AuthController } from './controllers/auth.controller';
import { CustomerAuthController } from './controllers/customer.controller';
import { EmployeeAuthController } from './controllers/employee.controller';
import { AuthorizationGuard, JwtAuthGuard } from './guards';
import { JwtStrategy } from './jwt.strategy';
import { CustomerRepository } from './repositories/customer.repository';
import { EmployeeRepository } from './repositories/employee.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { CustomerAuthService } from './services/customer-auth.service';
import { EmployeeAuthService } from './services/employee-auth.service';
import { EmployeeAuthzCacheService } from './services/employee-authz-cache.service';
import { OtpService } from './services/otp.service';
import { PasswordResetService } from './services/password-reset.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: DEFAULT_ACCESS_EXPIRATION },
      }),
    }),
  ],
  controllers: [AuthController, CustomerAuthController, EmployeeAuthController],
  providers: [
    TokenService,
    OtpService,
    PasswordResetService,
    EmployeeAuthzCacheService,
    CustomerAuthService,
    EmployeeAuthService,
    CustomerRepository,
    EmployeeRepository,
    RefreshTokenRepository,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
  exports: [
    TokenService,
    OtpService,
    PasswordResetService,
    JwtModule,
    RefreshTokenRepository,
    EmployeeAuthzCacheService,
    CustomerAuthService,
    EmployeeAuthService,
  ],
})
export class AuthModule {}
