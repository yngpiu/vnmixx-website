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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import {
  CreateEmployeeDto,
  EmployeeDetailResponseDto,
  EmployeeListResponseDto,
  ListEmployeesQueryDto,
  UpdateEmployeeDto,
} from '../dto';
import { EmployeeService } from '../services/employee.service';

@ApiTags('Employees')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/employees')
export class EmployeeAdminController {
  constructor(private readonly employeeService: EmployeeService) {}

  @ApiOperation({
    summary: 'List employees',
    description:
      'Paginated list with optional search, active-status filter, and soft-delete inclusion.',
  })
  @ApiOkResponse({ type: EmployeeListResponseDto })
  @Get()
  findAll(@Query() query: ListEmployeesQueryDto) {
    return this.employeeService.findList({
      page: query.page!,
      limit: query.limit!,
      search: query.search,
      isActive: query.isActive,
      includeDeleted: query.includeDeleted,
    });
  }

  @ApiOperation({ summary: 'Get employee detail by ID' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new employee' })
  @ApiCreatedResponse({ type: EmployeeDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Request validation failed.' })
  @ApiConflictResponse({ description: 'Email or phone number is already in use.' })
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @ApiOperation({ summary: 'Update an employee' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Request validation failed or no fields were provided.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft-delete an employee' })
  @ApiNoContentResponse({ description: 'Employee deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Employee not found.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.employeeService.softDelete(id);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted employee' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found or not deleted.' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.restore(id);
  }
}
