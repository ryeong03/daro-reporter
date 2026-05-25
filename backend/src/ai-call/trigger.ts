import { makeCall } from './twilio';
import { supabase } from '../db/supabase';
import { registerCallContext } from '../api/twilio-webhook';

/**
 * AI 콜 파이프라인 트리거.
 * 이상 감지 → Twilio 발신 → 결과는 webhook으로 비동기 처리.
 */
export async function triggerAICall(userId: string, eventType: 'heatstroke' | 'syncope'): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('phone, name')
    .eq('id', userId)
    .single();

  if (!user) {
    console.error(`[ai-call] User ${userId} not found`);
    return;
  }

  // 최신 alert_id 조회 (call_logs에 연결용)
  const { data: alert } = await supabase
    .from('alerts')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'triggered')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`[ai-call] Triggering call to ${user.name} (${user.phone}) for ${eventType}`);

  try {
    const callSid = await makeCall(user.phone, userId, eventType);
    registerCallContext(callSid, userId, eventType, alert?.id ?? null, 1);
  } catch (err) {
    console.error('[ai-call] Failed to initiate call:', err);
    const { notifyEmergency } = await import('../notify/emergency');
    await notifyEmergency(userId, eventType, 'call_failed');
  }
}
