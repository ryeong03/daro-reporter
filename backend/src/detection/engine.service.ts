import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { StateMachineService, UserState } from '../state/state-machine.service';
import { TriggerService } from '../ai-call/trigger.service';
import { WeatherService } from '../external/weather.service';

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

@Injectable()
export class DetectionEngineService {
  private readonly logger = new Logger(DetectionEngineService.name);

  constructor(
    private supabaseService: SupabaseService,
    private stateMachine: StateMachineService,
    private triggerService: TriggerService,
    private weatherService: WeatherService,
  ) {}

  async processHealthData(userId: string, input: HealthInput): Promise<DetectionResult> {
    const db = this.supabaseService.db;

    const { data: user } = await db
      .from('users')
      .select('baseline_bpm, baseline_sigma')
      .eq('id', userId)
      .single();

    if (!user) {
      return { state: 'unknown', triggered: false };
    }

    const baseline = Number(user.baseline_bpm);
    const sigma = Number(user.baseline_sigma || 10);
    const state = this.stateMachine.getUserState(userId);
    const now = Date.now();

    const upperBound = baseline + 2 * sigma;
    const highThreshold = baseline * 1.5;
    const lowThreshold = baseline * 0.7;

    const isHigh = input.avgBpm >= highThreshold;
    const isLow = input.avgBpm <= lowThreshold;
    const isInactive = input.steps === 0;
    const isRecovered = input.avgBpm <= upperBound && input.avgBpm >= baseline - 2 * sigma;

    this.weatherService.applyWeatherWeight(userId, input.lat, input.lng).catch(() => {});

    let newState: UserState = { ...state };

    switch (state.phase) {
      case 'normal':
        if (isHigh) {
          newState = { phase: 'stage1_hr_high', enteredAt: now, triggerType: 'heatstroke' };
        } else if (isLow) {
          newState = { phase: 'observing', enteredAt: now, triggerType: 'syncope' };
        }
        break;

      case 'stage1_hr_high':
        if (!isHigh) {
          newState = { phase: 'normal', enteredAt: now };
        } else if (now - state.enteredAt >= 5 * 60 * 1000) {
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
          newState = { phase: 'alert', enteredAt: now, triggerType: state.triggerType };
          await this.createAlert(userId, state.triggerType!, input.lat, input.lng);
          this.triggerService.triggerAICall(userId, state.triggerType!);
        }
        break;
      }

      case 'alert':
        break;
    }

    this.stateMachine.updateUserState(userId, newState);

    return {
      state: newState.phase,
      triggered: newState.phase === 'alert',
      eventType: newState.phase === 'alert' ? newState.triggerType : undefined,
    };
  }

  private async createAlert(userId: string, eventType: string, lat: number, lng: number) {
    await this.supabaseService.db.from('alerts').insert({
      user_id: userId,
      event_type: eventType,
      status: 'triggered',
      lat,
      lng,
    });
  }
}
