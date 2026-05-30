import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class TwilioCallService {
  private readonly logger = new Logger(TwilioCallService.name);

  constructor(private config: ConfigService) {}

  private getClient() {
    return twilio(
      this.config.get<string>('TWILIO_ACCOUNT_SID')!,
      this.config.get<string>('TWILIO_AUTH_TOKEN')!,
    );
  }

  private toE164(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (phone.startsWith('+')) return phone;
    if (digits.startsWith('82')) return `+${digits}`;
    if (digits.startsWith('010')) return `+82${digits.slice(1)}`;
    return phone;
  }

  async makeCall(toPhone: string, userId: string, eventType: string): Promise<string> {
    const client = this.getClient();
    const baseUrl = this.config.get<string>('BASE_URL') || 'https://your-server.ngrok.io';
    const to = this.toE164(toPhone);

    const call = await client.calls.create({
      to,
      from: this.config.get<string>('TWILIO_PHONE_NUMBER')!.replace(/\s/g, ''),
      url: `${baseUrl}/twilio/voice-response?userId=${userId}&eventType=${eventType}`,
      statusCallback: `${baseUrl}/twilio/voice-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      timeout: 30,
    });

    this.logger.log(`Call initiated: ${call.sid}`);
    return call.sid;
  }

  async callHealthCenter(userName: string, eventType: string, location: string): Promise<string> {
    const client = this.getClient();
    const healthCenterPhone = this.config.get<string>('HEALTH_CENTER_PHONE')!;

    const message = `긴급 알림입니다. ${userName}님에게 ${eventType === 'heatstroke' ? '열사병' : '실신'} 의심 상황이 발생했습니다. 위치는 ${location}입니다. 즉시 확인 바랍니다.`;

    const call = await client.calls.create({
      to: healthCenterPhone,
      from: this.config.get<string>('TWILIO_PHONE_NUMBER')!.replace(/\s/g, ''),
      twiml: `<Response><Say language="ko-KR">${message}</Say><Pause length="2"/><Say language="ko-KR">${message}</Say></Response>`,
    });

    this.logger.log(`Health center call: ${call.sid}`);
    return call.sid;
  }
}
