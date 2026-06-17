import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { DetectionEngineService } from '../detection/engine.service';
import { HealthPayload } from './health.schema';
import { resolveCoordinates } from '../config/default-location';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private detectionEngine: DetectionEngineService,
  ) {}

  async processIncoming(data: HealthPayload) {
    const avgBpm = data.heart_rate.reduce((sum, s) => sum + s.bpm, 0) / data.heart_rate.length;

    const { data: user } = await this.supabaseService.db
      .from('users')
      .select('phone')
      .eq('id', data.user_id)
      .maybeSingle();

    const coords = resolveCoordinates(data.location, user?.phone);

    const { error } = await this.supabaseService.db.from('health_data').insert({
      user_id: data.user_id,
      timestamp: data.timestamp,
      heart_rate_avg: avgBpm,
      heart_rate_samples: data.heart_rate,
      steps_10min: data.steps_10min,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      accuracy: data.location.accuracy,
    });

    if (error) {
      this.logger.error('DB insert error', error);
      throw new Error('DB error');
    }

    const detectionResult = await this.detectionEngine.processHealthData(data.user_id, {
      avgBpm,
      steps: data.steps_10min,
      lat: coords?.lat ?? 0,
      lng: coords?.lng ?? 0,
      timestamp: data.timestamp,
    });

    return { status: 'ok', detection: detectionResult };
  }
}
