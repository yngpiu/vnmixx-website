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
import { CustomerProfileResponseDto, UpdateCustomerProfileDto } from '../dto';
import { ProfileService } from '../services/profile.service';

@ApiTags('Profile')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
@RequireUserType('CUSTOMER')
@Controller('profile')
export class CustomerProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({ summary: 'Get current customer profile' })
  @ApiOkResponse({ type: CustomerProfileResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found.' })
  @Get()
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getCustomerProfile(user.id);
  }

  @ApiOperation({ summary: 'Update current customer profile' })
  @ApiOkResponse({
    type: CustomerProfileResponseDto,
    description: 'Customer profile updated successfully.',
  })
  @ApiBadRequestResponse({ description: 'Request validation failed or no fields were provided.' })
  @ApiNotFoundResponse({ description: 'Customer not found.' })
  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Body() dto: UpdateCustomerProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profileService.updateCustomerProfile(user.id, dto);
  }
}
