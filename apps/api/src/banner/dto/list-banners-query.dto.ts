import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { TransformQueryOptionalBoolean } from '../../common/decorators/query-optional-bool.decorator';

export class ListBannersQueryDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Không gửi = không lọc; true/false = chỉ đang bật / chỉ tắt.',
  })
  @TransformQueryOptionalBoolean()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là kiểu boolean' })
  @IsOptional()
  isActive?: boolean;
}
