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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireUserType } from '../../auth/decorators';
import { ColorAdminResponseDto, CreateColorDto, UpdateColorDto } from '../dto';
import { ColorService } from '../services/color.service';

@ApiTags('Colors')
@ApiBearerAuth('access-token')
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
  @ApiConflictResponse({ description: 'Name or hex code already taken' })
  @Post()
  create(@Body() dto: CreateColorDto): Promise<ColorAdminResponseDto> {
    return this.colorService.create(dto);
  }

  @ApiOperation({ summary: 'Update a color' })
  @ApiOkResponse({ type: ColorAdminResponseDto })
  @ApiNotFoundResponse({ description: 'Color not found' })
  @ApiConflictResponse({ description: 'Name or hex code already taken' })
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateColorDto,
  ): Promise<ColorAdminResponseDto> {
    return this.colorService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a color' })
  @ApiNoContentResponse({ description: 'Color deleted' })
  @ApiNotFoundResponse({ description: 'Color not found' })
  @ApiConflictResponse({ description: 'Color is in use' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.colorService.remove(id);
  }
}
