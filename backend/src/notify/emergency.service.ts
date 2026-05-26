import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { SmsService } from './sms.service';
import { SlackService } from './slack.service';
import { TwilioCallService } from '../ai-call/twilio-call.service';
import { KakaoMapService } from '../external/kakao-map.service';
import { GuardianService } from '../guardian/guardian.service';

type EventType = 'heatstroke' | 'syncope' | 'fall';

const EVENT_LABELS: Record<EventType, string> = {
  heatstroke: '열사병/열탈진 의심',
  syncope: '실신 의심',
  fall: '낙상 감지',
};

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    private supabaseService: SupabaseService,
    private smsService: SmsService,
    private slackService: SlackService,
    @Inject(forwardRef(() => TwilioCallService))
    private twilioCallService: TwilioCallService,
    private kakaoMapService: KakaoMapService,
    @Inject(forwardRef(() => GuardianService))
    private guardianService: GuardianService,
    private config: ConfigService,
  ) {}

  async notifyEmergency(userId: string, eventType: EventType, reason: string): Promise<void> {
    const db = this.supabaseService.db;

    const { data: user } = await db
      .from('users')
      .select('name, phone')
      .eq('id', userId)
      .single();

    if (!user) {
      this.logger.error(`User ${userId} not found`);
      return;
    }

    const { data: latestHealth } = await db
      .from('health_data')
      .select('lat, lng')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const lat = latestHealth?.lat || 0;
    const lng = latestHealth?.lng || 0;

    const addressResult = await this.kakaoMapService.coordToAddress(lat, lng);
    const locationStr = addressResult?.address || `위도 ${lat}, 경도 ${lng}`;
    const mapLink = `https://map.kakao.com/link/map/${lat},${lng}`;

    const eventLabel = EVENT_LABELS[eventType];
    const message = `[Hero 긴급] ${user.name}님 ${eventLabel}\n위치: ${locationStr}\n지도: ${mapLink}\n사유: ${reason}\n즉시 확인 필요`;

    const { data: alert } = await db
      .from('alerts')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const alertId = alert?.id;

    const { data: guardians } = await db
      .from('guardians')
      .select('id, phone, name')
      .eq('user_id', userId);

    const healthCenterPhone = this.config.get<string>('HEALTH_CENTER_PHONE')!;

    const coreNotifications = Promise.allSettled([
      this.smsService.sendSMS(healthCenterPhone, message),
      this.slackService.sendAlert(message, { userId, eventType, lat, lng, reason }),
      this.twilioCallService.callHealthCenter(user.name, eventType, locationStr),
    ]);

    const baseUrl = this.config.get<string>('DASHBOARD_URL') || 'https://daro-reporter.vercel.app';

    const guardianNotifications = (guardians || []).map((g) => {
      const token = this.guardianService.generateEmergencyToken(g.id, userId, alertId || 0);
      const emergencyLink = `${baseUrl}/emergency?token=${token}`;
      const guardianMessage = `[Hero 긴급] ${user.name} 어르신에게 ${eventLabel} 상황이 발생했습니다.\n위치: ${locationStr}\n지도: ${mapLink}\n보건소에 자동 알림이 전달되었습니다.\n\n상세 확인: ${emergencyLink}`;
      return this.smsService.sendSMS(g.phone, guardianMessage);
    });

    const [coreResults] = await Promise.all([
      coreNotifications,
      Promise.allSettled(guardianNotifications),
    ]);

    const channels = ['sms', 'slack', 'call'] as const;
    for (const [i, result] of (await coreResults).entries()) {
      await db.from('notification_logs').insert({
        alert_id: alertId,
        channel: channels[i],
        recipient: i === 0 ? healthCenterPhone : (i === 1 ? 'slack' : healthCenterPhone),
        success: result.status === 'fulfilled',
        payload: { message },
      });
    }

    for (const guardian of (guardians || [])) {
      await db.from('notification_logs').insert({
        alert_id: alertId,
        channel: 'sms',
        recipient: guardian.phone,
        success: true,
        payload: { type: 'guardian' },
      });
    }

    if (alertId) {
      await db
        .from('alerts')
        .update({ status: 'closed_emergency', resolved_at: new Date().toISOString() })
        .eq('id', alertId);
    }

    this.logger.log(`Emergency notifications sent for ${user.name} (+ ${guardians?.length || 0} guardians)`);
  }
}
