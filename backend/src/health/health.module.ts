import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DetectionModule } from '../detection/detection.module';

@Module({
  imports: [DetectionModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
