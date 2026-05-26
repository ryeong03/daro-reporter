import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SlackService } from './slack.service';
import { EmergencyService } from './emergency.service';

@Global()
@Module({
  providers: [SmsService, SlackService, EmergencyService],
  exports: [SmsService, SlackService, EmergencyService],
})
export class NotifyModule {}
