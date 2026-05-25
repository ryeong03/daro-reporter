import { getUserState, updateUserState, UserState } from '../state/state-machine';
import { supabase } from '../db/supabase';
import { triggerAICall } from '../ai-call/trigger';

export interface HealthInput {
  avgBpm: number;
  steps: number;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface DetectionResult {
  state: string;
  triggered: boolean;
  eventType?: 'heatstroke' | 'syncope';
}

export async function processHealthData(userId: string, input: HealthInput): Promise<DetectionResult> {
  const { data: user } = await supabase
    .from('users')
    .select('baseline_bpm')
    .eq('id', userId)
    .single();

  if (!user) {
    return { state: 'unknown', triggered: false };
  }

  const baseline = Number(user.baseline_bpm);
  const state = getUserState(userId);
  const now = Date.now();

  // A. 심박 상승 트리거 (50% 이상)
  const highThreshold = baseline * 1.5;
  // B. 심박 급락 트리거 (30% 이상 하락)
  const lowThreshold = baseline * 0.7;

  const isHigh = input.avgBpm >= highThreshold;
  const isLow = input.avgBpm <= lowThreshold;
  const isInactive = input.steps === 0;
  const isRecovered = input.avgBpm >= baseline * 0.85 && input.avgBpm <= baseline * 1.15;

  let newState: UserState = { ...state };

  switch (state.phase) {
    case 'normal':
      if (isHigh) {
        newState = { phase: 'stage1_hr_high', enteredAt: now, triggerType: 'heatstroke' };
      } else if (isLow) {
        // 급락은 즉시 분기 관찰 진입
        newState = { phase: 'observing', enteredAt: now, triggerType: 'syncope' };
      }
      break;

    case 'stage1_hr_high':
      if (!isHigh) {
        newState = { phase: 'normal', enteredAt: now };
      } else if (now - state.enteredAt >= 5 * 60 * 1000) {
        // 5분 지속 → 2단계
        if (isInactive) {
          newState = { phase: 'observing', enteredAt: now, triggerType: 'heatstroke' };
        } else {
          newState = { phase: 'stage2_waiting_inactive', enteredAt: state.enteredAt, triggerType: 'heatstroke' };
        }
      }
      break;

    case 'stage2_waiting_inactive':
      if (!isHigh) {
        newState = { phase: 'normal', enteredAt: now };
      } else if (isInactive) {
        newState = { phase: 'observing', enteredAt: now, triggerType: state.triggerType };
      }
      break;

    case 'observing': {
      const observeWindow = state.shortenedWindow ? 60 * 1000 : 2 * 60 * 1000;
      if (isRecovered) {
        newState = { phase: 'normal', enteredAt: now };
      } else if (now - state.enteredAt >= observeWindow) {
        // 관찰 시간 초과 → alert 발동
        newState = { phase: 'alert', enteredAt: now, triggerType: state.triggerType };

        await createAlert(userId, state.triggerType!, input.lat, input.lng);
        triggerAICall(userId, state.triggerType!);
      }
      break;
    }

    case 'alert':
      // AI 콜 처리 중. 콜 결과에 의해 상태 전이됨.
      break;
  }

  updateUserState(userId, newState);

  return {
    state: newState.phase,
    triggered: newState.phase === 'alert',
    eventType: newState.phase === 'alert' ? newState.triggerType : undefined,
  };
}

async function createAlert(userId: string, eventType: string, lat: number, lng: number) {
  await supabase.from('alerts').insert({
    user_id: userId,
    event_type: eventType,
    status: 'triggered',
    lat,
    lng,
  });
}
