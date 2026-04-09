import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../decorators';
import { AuthResponseDto, LoginDto } from '../dto';
import { EmployeeAuthService } from '../services/employee-auth.service';
import { TokenService } from '../services/token.service';
import { extractRequestMeta } from '../utils';

@Throttle({ default: { ttl: 60_000, limit: 5 } })
@ApiTags('Auth')
@Controller('auth/admin')
export class EmployeeAuthController {
  constructor(
    private readonly employeeAuth: EmployeeAuthService,
    private readonly tokenService: TokenService,
  ) {}

  @ApiOperation({ summary: 'Đăng nhập với vai trò nhân viên' })
  @ApiOkResponse({
    type: AuthResponseDto,
    description: 'Đăng nhập nhân viên thành công kèm vai trò và quyền.',
  })
  @ApiUnauthorizedResponse({
    description: 'Thông tin đăng nhập không hợp lệ hoặc tài khoản đã bị vô hiệu hóa.',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const { user, roles, permissions } = await this.employeeAuth.loginEmployee(dto);
    return this.tokenService.issueTokenPair(
      user,
      'EMPLOYEE',
      extractRequestMeta(req),
      roles,
      permissions,
    );
  }
}
