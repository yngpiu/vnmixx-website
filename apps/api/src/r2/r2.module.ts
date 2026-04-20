import { Global, Module } from '@nestjs/common';
import { R2Service } from './r2.service';

/**
 * Module quản lý lưu trữ đối tượng (Object Storage) sử dụng Cloudflare R2.
 * Được đánh dấu @Global để có thể sử dụng R2Service ở bất kỳ đâu trong ứng dụng.
 */
@Global()
@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class R2Module {}
