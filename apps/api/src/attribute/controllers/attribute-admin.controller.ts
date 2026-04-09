import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
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
  AttributeResponseDto,
  AttributeValueAdminResponseDto,
  CreateAttributeDto,
  CreateAttributeValueDto,
  UpdateAttributeDto,
  UpdateAttributeValueDto,
} from '../dto';
import { AttributeService } from '../services/attribute.service';

@ApiTags('Attributes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/attributes')
export class AttributeAdminController {
  constructor(private readonly attributeService: AttributeService) {}

  @ApiOperation({ summary: 'List all attributes with their values' })
  @ApiOkResponse({ type: [AttributeResponseDto] })
  @Get()
  findAll(): Promise<AttributeResponseDto[]> {
    return this.attributeService.findAll();
  }

  @ApiOperation({ summary: 'Create a new attribute' })
  @ApiCreatedResponse({ type: AttributeResponseDto })
  @ApiConflictResponse({ description: 'Attribute name is already in use.' })
  @Post()
  create(@Body() dto: CreateAttributeDto): Promise<AttributeResponseDto> {
    return this.attributeService.create(dto);
  }

  @ApiOperation({ summary: 'Update an attribute' })
  @ApiOkResponse({ type: AttributeResponseDto })
  @ApiNotFoundResponse({ description: 'Attribute not found.' })
  @ApiConflictResponse({ description: 'Attribute name is already in use.' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAttributeDto,
  ): Promise<AttributeResponseDto> {
    return this.attributeService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an attribute (cascades to values)' })
  @ApiNoContentResponse({ description: 'Attribute deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Attribute not found.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.attributeService.remove(id);
  }

  // ─── Attribute Values ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Add a value to an attribute' })
  @ApiCreatedResponse({ type: AttributeValueAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Attribute not found.' })
  @ApiConflictResponse({ description: 'Attribute value already exists.' })
  @Post(':id/values')
  createValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAttributeValueDto,
  ): Promise<AttributeValueAdminResponseDto> {
    return this.attributeService.createValue(id, dto);
  }

  @ApiOperation({ summary: 'Update an attribute value' })
  @ApiOkResponse({ type: AttributeValueAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Attribute or value not found.' })
  @ApiConflictResponse({ description: 'Attribute value already exists.' })
  @Put(':id/values/:valueId')
  updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number,
    @Body() dto: UpdateAttributeValueDto,
  ): Promise<AttributeValueAdminResponseDto> {
    return this.attributeService.updateValue(id, valueId, dto);
  }

  @ApiOperation({ summary: 'Delete an attribute value' })
  @ApiNoContentResponse({ description: 'Attribute value deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Attribute or value not found.' })
  @Delete(':id/values/:valueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeValue(
    @Param('id', ParseIntPipe) id: number,
    @Param('valueId', ParseIntPipe) valueId: number,
  ): Promise<void> {
    return this.attributeService.removeValue(id, valueId);
  }
}
