import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service';
import { DetectionEngineService } from '../detection/engine.service';
import { HealthPayload } from './health.schema';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private detectionEngine: DetectionEngineService,
  ) {}

  async processIncoming(data: HealthPayload) {
    const avgBpm = data.heart_rate.reduce((sum, s) => sum + s.bpm, 0) / data.heart_rate.length;

    const { error } = await this.supabaseService.db.from('health_data').insert({
      user_id: data.user_id,
      timestamp: data.timestamp,
      heart_rate_avg: avgBpm,
      heart_rate_samples: data.heart_rate,
      steps_10min: data.steps_10min,
      lat: data.location.lat,
      lng: data.location.lng,
      accuracy: data.location.accuracy,
    });

    if (error) {
      this.logger.error('DB insert error', error);
      throw new Error('DB error');
    }

    const detectionResult = await this.detectionEngine.processHealthData(data.user_id, {
      avgBpm,
      steps: data.steps_10min,
      lat: data.location.lat,
      lng: data.location.lng,
      timestamp: data.timestamp,
    });

    return { status: 'ok', detection: detectionResult };
  }
}
