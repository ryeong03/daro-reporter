import { Controller, Get } from '@nestjs/common';
import { TwilioCallService } from './ai-call/twilio-call.service';

@Controller()
export class AppController {
  constructor(private readonly twilioCallService: TwilioCallService) {}

  @Get()
  getStatus() {
    return { status: 'ok', service: 'Hero Backend' };
  }

  @Get('health/twilio')
  async getTwilioHealth() {
    return this.twilioCallService.checkCredentials();
  }
}
