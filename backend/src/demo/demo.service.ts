import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../database/supabase.service';
import { AlertService } from '../alert/alert.service';
import { resolveDemoUserId } from '../config/demo-user';
import { resolveCoordinates, getUserFixedLocation, EWHA_STARTUP_OPEN_SPACE } from '../config/default-location';

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private supabaseService: SupabaseService,
    private alertService: AlertService,
    private config: ConfigService,
  ) {}

  async getDemoInfo() {
    const db = this.supabaseService.db;
    const userId = await resolveDemoUserId(db, this.config);

    const { data: user, error } = await db
      .from('users')
      .select('id, name, phone, baseline_bpm, birth_date')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('시연 계정 정보를 불러오지 못했습니다.');
    }

    const { data: activeAlert } = await db
      .from('alerts')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling', 'emergency'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      user,
      location: EWHA_STARTUP_OPEN_SPACE,
      active_alert: activeAlert,
    };
  }

  /** 진행 중 알림만 정리 — 낙상 시연 시작 전용 (심박·처리완료 이력은 유지) */
  private async clearActiveDemoIncidents(userId: string) {
    const now = new Date().toISOString();
    const { data } = await this.supabaseService.db
      .from('alerts')
      .update({ status: 'false_alarm', resolved_at: now })
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling', 'emergency'])
      .select('id');

    return data?.length ?? 0;
  }

  /** 활성 알림 정리 — 시연 전/후 대시보드가 항상 emergency로 보이지 않게 */
  async resetDemo() {
    const db = this.supabaseService.db;
    const userId = await resolveDemoUserId(db, this.config);
    const now = new Date().toISOString();

    const { data: user, error } = await db
      .from('users')
      .select('phone, name, baseline_bpm')
      .eq('id', userId)
      .maybeSingle();

    if (error || !user) {
      throw new NotFoundException('시연 계정 정보를 불러오지 못했습니다.');
    }

    const { data: closed } = await db
      .from('alerts')
      .update({ status: 'false_alarm', resolved_at: now })
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling', 'emergency', 'closed_emergency'])
      .select('id');

    const baseline = user.baseline_bpm ?? 75;
    const coords =
      getUserFixedLocation(user.phone, userId, user.name) ?? EWHA_STARTUP_OPEN_SPACE;

    await db.from('health_data').insert({
      user_id: userId,
      timestamp: now,
      heart_rate_avg: baseline,
      heart_rate_samples: [{ t: now, bpm: baseline }],
      steps_10min: 0,
      lat: coords.lat,
      lng: coords.lng,
      accuracy: 10,
    });

    this.logger.log(
      `Demo reset for ${userId}: ${closed?.length ?? 0} alert(s) cleared, HR → ${baseline} bpm`,
    );

    return {
      status: 'ok',
      action: 'demo_reset',
      cleared_alerts: closed?.length ?? 0,
      restored_heart_rate: baseline,
    };
  }

  /** 낙상 감지 시연 — alert 생성 + AI콜 발신 */
  async triggerFallDemo() {
    const db = this.supabaseService.db;

    try {
      const userId = await resolveDemoUserId(db, this.config);
      const cleared = await this.clearActiveDemoIncidents(userId);
      if (cleared > 0) {
        this.logger.log(`Cleared ${cleared} active demo alert(s) before fall trigger`);
      }

      const { data: user, error } = await db
        .from('users')
        .select('phone, name, device_id')
        .eq('id', userId)
        .maybeSingle();

      if (error || !user) {
        throw new InternalServerErrorException('시연 계정 정보를 불러오지 못했습니다.');
      }

      const coords =
        getUserFixedLocation(user.phone, userId, user.name) ??
        resolveCoordinates(null, user.phone, userId, user.name) ??
        EWHA_STARTUP_OPEN_SPACE;

      await db.from('health_data').insert({
        user_id: userId,
        timestamp: new Date().toISOString(),
        heart_rate_avg: 98,
        heart_rate_samples: [{ t: new Date().toISOString(), bpm: 98 }],
        steps_10min: 120,
        lat: coords.lat,
        lng: coords.lng,
        accuracy: 10,
      });

      const result = await this.alertService.handleDeviceEvent({
        device_id: user.device_id || 'demo-device',
        user_id: userId,
        type: 'fall_detected',
        timestamp: new Date().toISOString(),
        location: { lat: coords.lat, lng: coords.lng },
      });

      this.logger.log(`Demo fall triggered for user ${userId}: ${result.action}`);

      return {
        ...result,
        demo_user: { id: userId, name: user.name, phone: user.phone },
        hint: '전화를 받고 emergency 멘트를 말하면 보건소 알림까지 이어집니다.',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Demo fall failed: ${message}`);
      throw err;
    }
  }
}
