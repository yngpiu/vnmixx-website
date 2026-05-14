import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

const SUPPORT_CHAT_AI_MODE_ENUM = {
  AUTO: 'AUTO',
  PAUSED: 'PAUSED',
  OFF: 'OFF',
} as const;

export class UpdateChatAiModeDto {
  @ApiProperty({ enum: ['AUTO', 'PAUSED', 'OFF'], example: 'OFF' })
  @IsEnum(SUPPORT_CHAT_AI_MODE_ENUM, { message: 'aiMode phải là AUTO, PAUSED hoặc OFF.' })
  aiMode!: 'AUTO' | 'PAUSED' | 'OFF';
}
