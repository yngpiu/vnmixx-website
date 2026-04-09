import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { EmployeeProfileResponseDto, UpdateEmployeeProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/profile')
export class EmployeeProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Get current employee profile' })
  @ApiOkResponse({ type: EmployeeProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getEmployeeProfile(user.id);
  }

  @ApiOperation({ summary: 'Update current employee profile' })
  @ApiOkResponse({
    type: EmployeeProfileResponseDto,
    description: 'Employee profile updated successfully.',
  })
  @ApiBadRequestResponse({ description: 'Request validation failed or no fields were provided.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() dto: UpdateEmployeeProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profileService.updateEmployeeProfile(user.id, dto);
  }
}
