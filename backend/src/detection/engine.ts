import { getUserState, updateUserState, UserState } from '../state/state-machine';
import { supabase } from '../db/supabase';
import { triggerAICall } from '../ai-call/trigger';
import { applyWeatherWeight } from '../external/weather';

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
  eventType?: 'heatstroke' | 'syncope' | 'fall';
}

/**
 * 헬스 데이터 수신 시마다 실행되는 감지 엔진.
 * 기준선: 평균 ± 2σ 바깥이면 이상으로 판단.
 */
export async function processHealthData(userId: string, input: HealthInput): Promise<DetectionResult> {
  const { data: user } = await supabase
    .from('users')
    .select('baseline_bpm, baseline_sigma')
    .eq('id', userId)
    .single();

  if (!user) {
    return { state: 'unknown', triggered: false };
  }

  const baseline = Number(user.baseline_bpm);
  const sigma = Number(user.baseline_sigma || 10);
  const state = getUserState(userId);
  const now = Date.now();

  // 이상 판단 기준: 평균 ± 2σ 바깥
  const upperBound = baseline + 2 * sigma;

  // A. 심박 상승 트리거: 기준선 대비 50% 이상 상승
  const highThreshold = baseline * 1.5;
  // B. 심박 급락 트리거: 기준선 대비 30% 이상 하락
  const lowThreshold = baseline * 0.7;

  const isHigh = input.avgBpm >= highThreshold;
  const isLow = input.avgBpm <= lowThreshold;
  const isInactive = input.steps === 0;
  // 회복 판단: 기준선 ± 2σ 범위 이내로 복귀
  const isRecovered = input.avgBpm <= upperBound && input.avgBpm >= baseline - 2 * sigma;

  // 환경 가중치 비동기 적용
  applyWeatherWeight(userId, input.lat, input.lng).catch(() => {});

  let newState: UserState = { ...state };

  switch (state.phase) {
    case 'normal':
      if (isHigh) {
        newState = { phase: 'stage1_hr_high', enteredAt: now, triggerType: 'heatstroke' };
      } else if (isLow) {
        // 급락은 즉시 분기 관찰 진입 (T=0)
        newState = { phase: 'observing', enteredAt: now, triggerType: 'syncope' };
      }
      break;

    case 'stage1_hr_high':
      if (!isHigh) {
        newState = { phase: 'normal', enteredAt: now };
      } else if (now - state.enteredAt >= 5 * 60 * 1000) {
        // 5분 지속 → 걸음수 확인
        if (isInactive) {
          // 걸음수 0인 순간 → 관찰 진입 (T=0)
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
      // 관찰 윈도우: 기본 2분, 환경 가중치 시 1분
      const observeWindow = state.shortenedWindow ? 60 * 1000 : 2 * 60 * 1000;

      if (isRecovered) {
        // T+2분 이내 기준선 ± 2σ 이내로 회복 → 정상
        newState = { phase: 'normal', enteredAt: now };
      } else if (now - state.enteredAt >= observeWindow) {
        // T+2분 시점에 심박이 여전히 기준선 +2σ 바깥 → alert
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
