import { Global, Module } from '@nestjs/common';
import { R2Service } from './services/r2.service';

// Cung cấp R2Service dùng chung toàn ứng dụng qua phạm vi Global module.
@Global()
@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class R2Module {}
