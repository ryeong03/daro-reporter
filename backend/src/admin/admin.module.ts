import { Global, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminAuthGuard } from './admin.guard';

@Global()
@Module({
  controllers: [AdminController],
  providers: [AdminAuthGuard],
  exports: [AdminAuthGuard],
})
export class AdminModule {}
