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
import { ColorAdminResponseDto, CreateColorDto, UpdateColorDto } from '../dto';
import { ColorService } from '../services/color.service';

@ApiTags('Colors')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Authentication is required or token is invalid.' })
@ApiForbiddenResponse({ description: 'You do not have permission to access this resource.' })
@RequireUserType('EMPLOYEE')
@Controller('admin/colors')
export class ColorAdminController {
  constructor(private readonly colorService: ColorService) {}

  @ApiOperation({ summary: 'List all colors (admin)' })
  @ApiOkResponse({ type: [ColorAdminResponseDto] })
  @Get()
  findAll(): Promise<ColorAdminResponseDto[]> {
    return this.colorService.findAll();
  }

  @ApiOperation({ summary: 'Create a new color' })
  @ApiCreatedResponse({ type: ColorAdminResponseDto })
  @ApiConflictResponse({ description: 'Color name or HEX code is already in use.' })
  @Post()
  create(@Body() dto: CreateColorDto): Promise<ColorAdminResponseDto> {
    return this.colorService.create(dto);
  }

  @ApiOperation({ summary: 'Update a color' })
  @ApiOkResponse({ type: ColorAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Color not found.' })
  @ApiConflictResponse({ description: 'Color name or HEX code is already in use.' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColorDto,
  ): Promise<ColorAdminResponseDto> {
    return this.colorService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a color' })
  @ApiNoContentResponse({ description: 'Color deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Color not found.' })
  @ApiConflictResponse({ description: 'Color cannot be deleted because it is in use.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.colorService.remove(id);
  }
}
