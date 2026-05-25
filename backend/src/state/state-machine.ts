export interface UserState {
  phase: 'normal' | 'stage1_hr_high' | 'stage2_waiting_inactive' | 'observing' | 'alert';
  enteredAt: number;
  triggerType?: 'heatstroke' | 'syncope';
  shortenedWindow?: boolean;
}

const states = new Map<string, UserState>();

const DEFAULT_STATE: UserState = {
  phase: 'normal',
  enteredAt: Date.now(),
};

export function getUserState(userId: string): UserState {
  return states.get(userId) || { ...DEFAULT_STATE };
}

export function updateUserState(userId: string, state: UserState): void {
  states.set(userId, state);
}

export function resetUserState(userId: string): void {
  states.delete(userId);
}

/**
 * 환경 가중치에 의해 관찰 윈도우 단축 적용
 */
export function applyShortenedWindow(userId: string): void {
  const state = getUserState(userId);
  if (state.phase === 'observing') {
    updateUserState(userId, { ...state, shortenedWindow: true });
  }
}
