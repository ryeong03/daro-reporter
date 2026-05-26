import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SlackContext {
  userId: string;
  eventType: string;
  lat: number;
  lng: number;
  reason: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(private config: ConfigService) {}

  async sendAlert(message: string, context: SlackContext): Promise<void> {
    const webhookUrl = this.config.get<string>('SLACK_WEBHOOK_URL')!;

    await axios.post(webhookUrl, {
      text: message,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '🚨 Hero 긴급 알림' },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: message },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*이벤트:* ${context.eventType}` },
            { type: 'mrkdwn', text: `*사유:* ${context.reason}` },
            { type: 'mrkdwn', text: `*위치:* ${context.lat}, ${context.lng}` },
            {
              type: 'mrkdwn',
              text: `*지도:* <https://map.kakao.com/link/map/${context.lat},${context.lng}|카카오맵 열기>`,
            },
          ],
        },
      ],
    });

    this.logger.log('Alert sent');
  }
}
