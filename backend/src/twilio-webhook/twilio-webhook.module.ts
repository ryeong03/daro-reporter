import { Module } from '@nestjs/common';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { TwilioWebhookService } from './twilio-webhook.service';

@Module({
  controllers: [TwilioWebhookController],
  providers: [TwilioWebhookService],
})
export class TwilioWebhookModule {}
