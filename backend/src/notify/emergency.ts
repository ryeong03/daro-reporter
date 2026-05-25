import { supabase } from '../db/supabase';
import { sendSMS } from './sms';
import { sendSlack } from './slack';
import { callHealthCenter } from '../ai-call/twilio';
import { coordToAddress } from '../external/kakao-map';

type EventType = 'heatstroke' | 'syncope' | 'fall';

const EVENT_LABELS: Record<EventType, string> = {
  heatstroke: '열사병/열탈진 의심',
  syncope: '실신 의심',
  fall: '낙상 감지',
};

/**
 * emergency 판단 시 전체 알림 발동.
 * 보건소 + 보호자 + Slack 동시 발송.
 */
export async function notifyEmergency(
  userId: string,
  eventType: EventType,
  reason: string
): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('name, phone')
    .eq('id', userId)
    .single();

  if (!user) {
    console.error(`[notify] User ${userId} not found`);
    return;
  }

  // 최신 위치 조회
  const { data: latestHealth } = await supabase
    .from('health_data')
    .select('lat, lng')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  const lat = latestHealth?.lat || 0;
  const lng = latestHealth?.lng || 0;

  // 주소 변환 (카카오맵)
  const address = await coordToAddress(lat, lng);
  const locationStr = address?.address || `위도 ${lat}, 경도 ${lng}`;
  const mapLink = `https://map.kakao.com/link/map/${lat},${lng}`;

  const eventLabel = EVENT_LABELS[eventType];
  const message = `[Hero 긴급] ${user.name}님 ${eventLabel}\n위치: ${locationStr}\n지도: ${mapLink}\n사유: ${reason}\n즉시 확인 필요`;

  // 최신 alert_id 조회
  const { data: alert } = await supabase
    .from('alerts')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const alertId = alert?.id;

  // 보호자 목록 조회
  const { data: guardians } = await supabase
    .from('guardians')
    .select('phone, name')
    .eq('user_id', userId);

  // 보건소 + Slack + 보건소 콜 발송
  const coreNotifications = Promise.allSettled([
    sendSMS(process.env.HEALTH_CENTER_PHONE!, message),
    sendSlack(message, { userId, eventType, lat, lng, reason }),
    callHealthCenter(user.name, eventType, locationStr),
  ]);

  // 보호자 SMS 발송 (복수)
  const guardianMessage = `[Hero 긴급] ${user.name} 어르신에게 ${eventLabel} 상황이 발생했습니다.\n위치: ${locationStr}\n지도: ${mapLink}\n보건소에 자동 알림이 전달되었습니다.`;

  const guardianNotifications = (guardians || []).map((g) =>
    sendSMS(g.phone, guardianMessage)
  );

  const [coreResults] = await Promise.all([
    coreNotifications,
    Promise.allSettled(guardianNotifications),
  ]);

  // 로깅
  const channels = ['sms', 'slack', 'call'] as const;
  for (const [i, result] of (await coreResults).entries()) {
    await supabase.from('notification_logs').insert({
      alert_id: alertId,
      channel: channels[i],
      recipient: i === 0 ? process.env.HEALTH_CENTER_PHONE : (i === 1 ? 'slack' : process.env.HEALTH_CENTER_PHONE),
      success: result.status === 'fulfilled',
      payload: { message },
    });
  }

  // 보호자 알림 로깅
  for (const guardian of (guardians || [])) {
    await supabase.from('notification_logs').insert({
      alert_id: alertId,
      channel: 'sms',
      recipient: guardian.phone,
      success: true,
      payload: { message: guardianMessage, type: 'guardian' },
    });
  }

  // alert 상태 업데이트
  if (alertId) {
    await supabase
      .from('alerts')
      .update({ status: 'closed_emergency', resolved_at: new Date().toISOString() })
      .eq('id', alertId);
  }

  console.log(`[notify] Emergency notifications sent for ${user.name} (+ ${guardians?.length || 0} guardians)`);
}
