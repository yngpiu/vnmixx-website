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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
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
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.findById(id);
  }

  @ApiOperation({ summary: 'Create a new employee' })
  @ApiCreatedResponse({ type: EmployeeDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'Email or phone number already in use' })
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto);
  }

  @ApiOperation({ summary: 'Update an employee' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiBadRequestResponse({ description: 'No fields provided or invalid data' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto);
  }

  @ApiOperation({ summary: 'Soft-delete an employee' })
  @ApiNoContentResponse({ description: 'Employee deleted' })
  @ApiNotFoundResponse({ description: 'Employee not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.employeeService.softDelete(id);
  }

  @ApiOperation({ summary: 'Restore a soft-deleted employee' })
  @ApiOkResponse({ type: EmployeeDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Employee not found or not deleted' })
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.restore(id);
  }
}
