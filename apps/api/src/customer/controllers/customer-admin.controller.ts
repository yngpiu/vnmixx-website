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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  CustomerDetailResponseDto,
  CustomerListResponseDto,
  ListCustomersQueryDto,
  UpdateCustomerDto,
} from '../dto';
import { CustomerService } from '../services/customer.service';

@ApiTags('Customers')
@ApiBearerAuth('access-token')
@RequireUserType('EMPLOYEE')
@Controller('admin/customers')
export class CustomerAdminController {
  constructor(private readonly customerService: CustomerService) {}

  @ApiOperation({
    summary: 'List customers',
    description:
      'Paginated list with optional search, active-status filter, and soft-delete inclusion.',
  })
  @ApiOkResponse({ type: CustomerListResponseDto })
  @Get()
  findAll(@Query() query: ListCustomersQueryDto) {
    return this.customerService.findList({
      page: query.page!,
      limit: query.limit!,
      search: query.search,
      isActive: query.isActive,
      includeDeleted: query.includeDeleted,
    });
  }

  @ApiOperation({ summary: 'Get customer detail by ID' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findById(id);
  }

  @ApiOperation({ summary: 'Update a customer' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiBadRequestResponse({ description: 'No fields provided or invalid data' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCustomerDto) {
    return this.customerService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft-delete a customer' })
  @ApiNoContentResponse({ description: 'Customer deleted' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.customerService.softDelete(id);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted customer' })
  @ApiOkResponse({ type: CustomerDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Customer not found or not deleted' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.restore(id);
  }
}
