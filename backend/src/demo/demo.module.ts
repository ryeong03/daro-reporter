import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';
import { AlertModule } from '../alert/alert.module';

@Module({
  imports: [AlertModule],
  controllers: [DemoController],
  providers: [DemoService],
})
export class DemoModule {}
