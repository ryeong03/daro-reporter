import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SlackContext {
  userId: string;
  eventType: string;
  lat?: number | null;
  lng?: number | null;
  reason: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(private config: ConfigService) {}

  async sendAlert(message: string, context: SlackContext): Promise<void> {
    const webhookUrl = this.config.get<string>('SLACK_WEBHOOK_URL')!;

    const hasCoords = context.lat != null && context.lng != null;
    const locationField = hasCoords
      ? { type: 'mrkdwn' as const, text: `*위치:* ${context.lat}, ${context.lng}` }
      : { type: 'mrkdwn' as const, text: '*위치:* 미확인 (GPS 없음)' };
    const mapField = hasCoords
      ? {
          type: 'mrkdwn' as const,
          text: `*지도:* <https://map.kakao.com/link/map/${context.lat},${context.lng}|카카오맵 열기>`,
        }
      : null;

    const fields = [
      { type: 'mrkdwn' as const, text: `*이벤트:* ${context.eventType}` },
      { type: 'mrkdwn' as const, text: `*사유:* ${context.reason}` },
      locationField,
      ...(mapField ? [mapField] : []),
    ];

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
          fields,
        },
      ],
    });

    this.logger.log('Alert sent');
  }
}
