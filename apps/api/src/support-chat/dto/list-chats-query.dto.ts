import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { parseOptionalBool } from '../../common/utils/query-bool.util';

/**
 * ListChatsQueryDto: DTO phân trang danh sách cuộc hội thoại hỗ trợ cho Admin.
 */
export class ListChatsQueryDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1).', example: 1, default: 1 })
  @IsOptional()
  @IsInt({ message: 'page phải là số nguyên.' })
  @Min(1, { message: 'page phải lớn hơn hoặc bằng 1.' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi mỗi trang (tối đa 50).',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsInt({ message: 'pageSize phải là số nguyên.' })
  @Min(1, { message: 'pageSize phải lớn hơn hoặc bằng 1.' })
  @Max(50, { message: 'pageSize không được lớn hơn 50.' })
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: 'Chỉ lấy những chat mà tôi (người gọi) đang được phân công.',
    example: true,
  })
  @IsOptional()
  @Transform(parseOptionalBool)
  @IsBoolean({ message: 'assignedToMe phải là kiểu boolean.' })
  assignedToMe?: boolean;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên, email hoặc số điện thoại khách hàng.',
    example: '0901',
  })
  @IsOptional()
  @IsString({ message: 'search phải là chuỗi ký tự.' })
  @MaxLength(100, { message: 'search không được vượt quá 100 ký tự.' })
  search?: string;
}
