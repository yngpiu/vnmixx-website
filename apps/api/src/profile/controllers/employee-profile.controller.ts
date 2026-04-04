import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { EmployeeProfileResponseDto, UpdateEmployeeProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@RequireUserType('EMPLOYEE')
@Controller('admin/profile')
export class EmployeeProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Get current employee profile' })
  @ApiOkResponse({ type: EmployeeProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getEmployeeProfile(user.id);
  }

  @ApiOperation({ summary: 'Update current employee profile' })
  @ApiOkResponse({ type: EmployeeProfileResponseDto, description: 'Profile updated' })
  @ApiBadRequestResponse({ description: 'No fields provided or invalid data' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() dto: UpdateEmployeeProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profileService.updateEmployeeProfile(user.id, dto);
  }
}
