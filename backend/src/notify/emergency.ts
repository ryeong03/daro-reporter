import { supabase } from '../db/supabase';
import { sendSMS } from './sms';
import { sendSlack } from './slack';
import { callHealthCenter } from '../ai-call/twilio';

/**
 * emergency 판단 시 보건소 알림 전체 발동.
 * SMS + Slack + 보건소 자동 콜을 동시 발송.
 */
export async function notifyEmergency(
  userId: string,
  eventType: 'heatstroke' | 'syncope',
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
  const locationStr = `위도 ${lat}, 경도 ${lng}`;

  const eventLabel = eventType === 'heatstroke' ? '열사병/열탈진 의심' : '실신 의심';
  const message = `[Hero 긴급] ${user.name}님 ${eventLabel}\n위치: ${locationStr}\n사유: ${reason}\n즉시 확인 필요`;

  // 최신 alert_id 조회
  const { data: alert } = await supabase
    .from('alerts')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const alertId = alert?.id;

  const results = await Promise.allSettled([
    sendSMS(process.env.HEALTH_CENTER_PHONE!, message),
    sendSlack(message, { userId, eventType, lat, lng, reason }),
    callHealthCenter(user.name, eventType, locationStr),
  ]);

  // 로깅
  for (const [i, result] of results.entries()) {
    const channels = ['sms', 'slack', 'call'] as const;
    await supabase.from('notification_logs').insert({
      alert_id: alertId,
      channel: channels[i],
      recipient: i === 0 ? process.env.HEALTH_CENTER_PHONE : (i === 1 ? 'slack' : process.env.HEALTH_CENTER_PHONE),
      success: result.status === 'fulfilled',
      payload: { message },
    });
  }

  // alert 상태 업데이트
  if (alertId) {
    await supabase
      .from('alerts')
      .update({ status: 'closed_emergency', resolved_at: new Date().toISOString() })
      .eq('id', alertId);
  }

  console.log(`[notify] Emergency notifications sent for ${user.name}`);
}
