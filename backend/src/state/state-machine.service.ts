import { Injectable } from '@nestjs/common';

export interface UserState {
  phase: 'normal' | 'stage1_hr_high' | 'stage2_waiting_inactive' | 'observing' | 'alert';
  enteredAt: number;
  triggerType?: 'heatstroke' | 'syncope';
  shortenedWindow?: boolean;
}

@Injectable()
export class StateMachineService {
  private readonly states = new Map<string, UserState>();

  private readonly DEFAULT_STATE: UserState = {
    phase: 'normal',
    enteredAt: Date.now(),
  };

  getUserState(userId: string): UserState {
    return this.states.get(userId) || { ...this.DEFAULT_STATE };
  }

  updateUserState(userId: string, state: UserState): void {
    this.states.set(userId, state);
  }

  resetUserState(userId: string): void {
    this.states.delete(userId);
  }

  applyShortenedWindow(userId: string): void {
    const state = this.getUserState(userId);
    if (state.phase === 'observing') {
      this.updateUserState(userId, { ...state, shortenedWindow: true });
    }
  }

  resolveAlert(userId: string): void {
    this.states.delete(userId);
  }
}
