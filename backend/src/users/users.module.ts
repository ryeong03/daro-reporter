import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DetectionModule } from '../detection/detection.module';

@Module({
  imports: [DetectionModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
