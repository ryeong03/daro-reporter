import { Controller, Get } from '@nestjs/common';
import { TwilioCallService } from './ai-call/twilio-call.service';
import { SttService } from './ai-call/stt.service';

@Controller()
export class AppController {
  constructor(
    private readonly twilioCallService: TwilioCallService,
    private readonly sttService: SttService,
  ) {}

  @Get()
  getStatus() {
    return { status: 'ok', service: 'Hero Backend' };
  }

  @Get('health/twilio')
  async getTwilioHealth() {
    return this.twilioCallService.checkCredentials();
  }

  @Get('health/clova')
  async getClovaHealth() {
    return this.sttService.checkHealth();
  }
}
