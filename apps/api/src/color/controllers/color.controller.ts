import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators';
import { ColorResponseDto } from '../dto';
import { ColorService } from '../services/color.service';

@ApiTags('Colors')
@Controller('colors')
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  @ApiOperation({ summary: 'Liệt kê tất cả màu sắc' })
  @ApiOkResponse({ type: [ColorResponseDto] })
  @Public()
  @Get()
  findAll(): Promise<ColorResponseDto[]> {
    return this.colorService.findAllPublic();
  }
}
