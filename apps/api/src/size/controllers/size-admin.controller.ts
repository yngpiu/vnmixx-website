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
import { CreateSizeDto, SizeAdminResponseDto, UpdateSizeDto } from '../dto';
import { SizeService } from '../services/size.service';

@ApiTags('Sizes')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/sizes')
export class SizeAdminController {
  constructor(private readonly sizeService: SizeService) {}

  @ApiOperation({ summary: 'List all sizes (admin)' })
  @ApiOkResponse({ type: [SizeAdminResponseDto] })
  @Get()
  findAll(): Promise<SizeAdminResponseDto[]> {
    return this.sizeService.findAll();
  }

  @ApiOperation({ summary: 'Create a new size' })
  @ApiCreatedResponse({ type: SizeAdminResponseDto })
  @ApiConflictResponse({ description: 'Size label is already in use.' })
  @Post()
  create(@Body() dto: CreateSizeDto): Promise<SizeAdminResponseDto> {
    return this.sizeService.create(dto);
  }

  @ApiOperation({ summary: 'Update a size' })
  @ApiOkResponse({ type: SizeAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Size not found.' })
  @ApiConflictResponse({ description: 'Size label is already in use.' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSizeDto,
  ): Promise<SizeAdminResponseDto> {
    return this.sizeService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a size' })
  @ApiNoContentResponse({ description: 'Size deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Size not found.' })
  @ApiConflictResponse({ description: 'Size cannot be deleted because it is in use.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.sizeService.remove(id);
  }
}
