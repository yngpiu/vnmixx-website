import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, RequireUserType } from '../../auth/decorators';
import type { AuthenticatedUser } from '../../auth/interfaces';
import { AddressResponseDto, CreateAddressDto, UpdateAddressDto } from '../dto';
import { AddressService } from '../services/address.service';

@ApiTags('Addresses')
@ApiBearerAuth('access-token')
@RequireUserType('CUSTOMER')
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @ApiOperation({ summary: 'List all addresses of the current customer' })
  @ApiOkResponse({ type: [AddressResponseDto] })
  @Get()
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<AddressResponseDto[]> {
    return this.addressService.findAll(user.id);
  }

  @ApiOperation({ summary: 'Get a specific address' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'Create a new address' })
  @ApiCreatedResponse({ type: AddressResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid location hierarchy' })
  @Post()
  async create(
    @Body() dto: CreateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.create(user.id, dto);
  }

  @ApiOperation({ summary: 'Update an address' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiBadRequestResponse({ description: 'Invalid location hierarchy' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete an address (soft delete)' })
  @ApiNoContentResponse({ description: 'Address deleted' })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.addressService.remove(id, user.id);
  }

  @ApiOperation({ summary: 'Set an address as default' })
  @ApiOkResponse({ type: AddressResponseDto })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @Patch(':id/set-default')
  async setDefault(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AddressResponseDto> {
    return this.addressService.setDefault(id, user.id);
  }
}
