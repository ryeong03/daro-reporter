import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private config: ConfigService) {}

  async sendSMS(to: string, body: string): Promise<string> {
    const client = twilio(
      this.config.get<string>('TWILIO_ACCOUNT_SID')!,
      this.config.get<string>('TWILIO_AUTH_TOKEN')!,
    );

    const message = await client.messages.create({
      to,
      from: this.config.get<string>('TWILIO_PHONE_NUMBER')!,
      body,
    });

    this.logger.log(`Sent to ${to}: ${message.sid}`);
    return message.sid;
  }
}
