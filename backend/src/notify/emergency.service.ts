import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { SmsService } from './sms.service';
import { SlackService } from './slack.service';
import { TwilioCallService } from '../ai-call/twilio-call.service';
import { KakaoMapService } from '../external/kakao-map.service';
import { GuardianService } from '../guardian/guardian.service';
import { resolveCoordinates } from '../config/default-location';

type EventType = 'heatstroke' | 'syncope' | 'fall';

const HEALTH_CENTER_REASON = '낙상 의심';

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

  async notifyEmergency(
    userId: string,
    eventType: EventType,
    reason: string,
    alertId?: number | null,
  ): Promise<void> {
    const db = this.supabaseService.db;

    if (await this.shouldSkipEmergency(userId, alertId)) {
      this.logger.log(
        `Skipping emergency for user ${userId} (${reason}) — already confirmed safe`,
      );
      return;
    }

    const { data: user } = await db
      .from('users')
      .select('name, phone')
      .eq('id', userId)
      .single();

    if (!user) {
      this.logger.error(`User ${userId} not found`);
      return;
    }

    let source: { lat?: number | null; lng?: number | null } | null = null;

    if (alertId) {
      const { data: alertRow } = await db
        .from('alerts')
        .select('lat, lng')
        .eq('id', alertId)
        .maybeSingle();
      source = alertRow;
    }

    const missingCoords =
      !source ||
      (source.lat == null && source.lng == null) ||
      (Number(source.lat) === 0 && Number(source.lng) === 0);

    if (missingCoords) {
      const { data: latestHealth } = await db
        .from('health_data')
        .select('lat, lng')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      source = latestHealth;
    }

    const coords = resolveCoordinates(source, user.phone);

    let locationStr: string;
    let mapLink = '';
    if (coords) {
      const { lat, lng } = coords;
      const addressResult = await this.kakaoMapService.coordToAddress(lat, lng);
      locationStr = addressResult?.address || `위도 ${lat}, 경도 ${lng}`;
      mapLink = `https://map.kakao.com/link/map/${lat},${lng}`;
    } else {
      locationStr = '위치 미확인 (GPS 없음)';
    }

    const eventLabel = EVENT_LABELS[eventType];
    const locationLines = mapLink
      ? `위치: ${locationStr}\n지도: ${mapLink}`
      : `위치: ${locationStr}`;
    const message = `[Hero 긴급] ${user.name}님 ${eventLabel}\n${locationLines}\n사유: ${HEALTH_CENTER_REASON}\n즉시 확인 필요`;

    let resolvedAlertId = alertId ?? null;
    if (!resolvedAlertId) {
      const { data: alert } = await db
        .from('alerts')
        .select('id, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedAlertId = alert?.id ?? null;

      if (alert?.status === 'closed_safe') {
        this.logger.log(`Skipping emergency — latest alert ${alert.id} is already closed_safe`);
        return;
      }
    }

    const { data: guardians } = await db
      .from('guardians')
      .select('id, phone, name')
      .eq('user_id', userId);

    const healthCenterPhone = this.config.get<string>('HEALTH_CENTER_PHONE')!;

    const coreNotifications = Promise.allSettled([
      this.smsService.sendSMS(healthCenterPhone, message),
      this.slackService.sendAlert(message, {
        userId,
        eventType,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        reason: HEALTH_CENTER_REASON,
      }),
      this.twilioCallService.callHealthCenter(user.name, eventType, locationStr),
    ]);

    const baseUrl = this.config.get<string>('DASHBOARD_URL') || 'https://daro-reporter.vercel.app';

    const guardianNotifications = (guardians || []).map((g) => {
      const token = this.guardianService.generateEmergencyToken(g.id, userId, resolvedAlertId || 0);
      const emergencyLink = `${baseUrl}/emergency?token=${token}`;
      const guardianLocationLines = mapLink
        ? `위치: ${locationStr}\n지도: ${mapLink}`
        : `위치: ${locationStr}`;
      const guardianMessage = `[Hero 긴급] ${user.name} 어르신에게 ${eventLabel} 상황이 발생했습니다.\n${guardianLocationLines}\n보건소에 자동 알림이 전달되었습니다.\n\n상세 확인: ${emergencyLink}`;
      return this.smsService.sendSMS(g.phone, guardianMessage);
    });

    const [coreResults] = await Promise.all([
      coreNotifications,
      Promise.allSettled(guardianNotifications),
    ]);

    const channels = ['sms', 'slack', 'call'] as const;
    for (const [i, result] of (await coreResults).entries()) {
      await db.from('notification_logs').insert({
        alert_id: resolvedAlertId,
        channel: channels[i],
        recipient: i === 0 ? healthCenterPhone : (i === 1 ? 'slack' : healthCenterPhone),
        success: result.status === 'fulfilled',
        payload: { message },
      });
    }

    for (const guardian of (guardians || [])) {
      await db.from('notification_logs').insert({
        alert_id: resolvedAlertId,
        channel: 'sms',
        recipient: guardian.phone,
        success: true,
        payload: { type: 'guardian' },
      });
    }

    if (resolvedAlertId) {
      const { data: current } = await db
        .from('alerts')
        .select('status')
        .eq('id', resolvedAlertId)
        .maybeSingle();

      if (current?.status !== 'closed_safe') {
        await db
          .from('alerts')
          .update({ status: 'closed_emergency', resolved_at: new Date().toISOString() })
          .eq('id', resolvedAlertId);
      }
    }

    this.logger.log(`Emergency notifications sent for ${user.name} (+ ${guardians?.length || 0} guardians)`);
  }

  /** 괜찮아요(safe) 확인 후 중복 alert·retry가 보건소 알림을 보내지 않도록 */
  private async shouldSkipEmergency(userId: string, alertId?: number | null): Promise<boolean> {
    const db = this.supabaseService.db;
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: recentSafeAlert } = await db
      .from('alerts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'closed_safe')
      .gte('resolved_at', since)
      .limit(1)
      .maybeSingle();

    if (recentSafeAlert) return true;

    if (alertId) {
      const { data: alert } = await db
        .from('alerts')
        .select('status')
        .eq('id', alertId)
        .maybeSingle();
      if (alert?.status === 'closed_safe') return true;
    }

    const { data: userAlerts } = await db
      .from('alerts')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', since);

    const alertIds = (userAlerts || []).map((a) => a.id);
    if (alertIds.length > 0) {
      const { data: safeCall } = await db
        .from('call_logs')
        .select('id')
        .in('alert_id', alertIds)
        .eq('classification', 'safe')
        .limit(1)
        .maybeSingle();
      if (safeCall) return true;
    }

    return false;
  }
}
