import { Global, Module, forwardRef } from '@nestjs/common';
import { SmsService } from './sms.service';
import { SlackService } from './slack.service';
import { EmergencyService } from './emergency.service';
import { GuardianModule } from '../guardian/guardian.module';

@Global()
@Module({
  imports: [forwardRef(() => GuardianModule)],
  providers: [SmsService, SlackService, EmergencyService],
  exports: [SmsService, SlackService, EmergencyService],
})
export class NotifyModule {}
