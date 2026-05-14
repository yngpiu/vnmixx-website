import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertShopContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  content: string;
}
