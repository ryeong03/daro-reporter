import { makeCall } from './twilio';
import { supabase } from '../db/supabase';

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

  console.log(`[ai-call] Triggering call to ${user.name} (${user.phone}) for ${eventType}`);

  try {
    await makeCall(user.phone, userId, eventType);
  } catch (err) {
    console.error('[ai-call] Failed to initiate call:', err);
    // 콜 실패 시 바로 보건소 알림
    const { notifyEmergency } = await import('../notify/emergency');
    await notifyEmergency(userId, eventType, 'call_failed');
  }
}
