import { Module } from '@nestjs/common';
import { DetectionEngineService } from './engine.service';
import { BaselineService } from './baseline.service';

@Module({
  providers: [DetectionEngineService, BaselineService],
  exports: [DetectionEngineService, BaselineService],
})
export class DetectionModule {}
