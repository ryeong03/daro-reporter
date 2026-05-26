import { Global, Module, forwardRef } from '@nestjs/common';
import { TwilioCallService } from './twilio-call.service';
import { SttService } from './stt.service';
import { ClassifyService } from './classify.service';
import { TriggerService } from './trigger.service';
import { NotifyModule } from '../notify/notify.module';

@Global()
@Module({
  imports: [forwardRef(() => NotifyModule)],
  providers: [TwilioCallService, SttService, ClassifyService, TriggerService],
  exports: [TwilioCallService, SttService, ClassifyService, TriggerService],
})
export class AiCallModule {}
