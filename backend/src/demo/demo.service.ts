import { Injectable, Logger } from '@nestjs/common';
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

    const { data: user } = await db
      .from('users')
      .select('id, name, phone, baseline_bpm, birth_date')
      .eq('id', userId)
      .single();

    const { data: activeAlert } = await db
      .from('alerts')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      user,
      location: EWHA_STARTUP_OPEN_SPACE,
      active_alert: activeAlert,
      script: [
        '1. [낙상 시연 시작] → 다로리님 대시보드 이상 감지 + 01025819543으로 AI 확인 전화',
        '2. 전화 받고 "너무 아파요, 구조 요청해줘" → emergency → 보건소·대시보드 알림 (대현동 33-7)',
        '3. [시연 종료] → 대시보드 정상 복귀',
      ],
    };
  }

  /** 활성 알림 정리 — 시연 전/후 대시보드가 항상 emergency로 보이지 않게 */
  async resetDemo() {
    const db = this.supabaseService.db;
    const userId = await resolveDemoUserId(db, this.config);
    const now = new Date().toISOString();

    const { data: closed } = await db
      .from('alerts')
      .update({ status: 'false_alarm', resolved_at: now })
      .eq('user_id', userId)
      .in('status', ['triggered', 'calling', 'emergency'])
      .select('id');

    this.logger.log(`Demo reset for ${userId}: ${closed?.length ?? 0} alert(s) cleared`);

    return {
      status: 'ok',
      action: 'demo_reset',
      cleared_alerts: closed?.length ?? 0,
    };
  }

  /** 낙상 감지 시연 — alert 생성 + AI콜 발신 (앱 없이 curl과 동일 파이프라인) */
  async triggerFallDemo() {
    const db = this.supabaseService.db;
    await this.resetDemo();

    const userId = await resolveDemoUserId(db, this.config);
    const { data: user } = await db
      .from('users')
      .select('phone, name, device_id')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error('Demo user not found');
    }

    const coords =
      getUserFixedLocation(user.phone) ?? resolveCoordinates(null, user.phone);

    if (coords) {
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
    }

    const result = await this.alertService.handleDeviceEvent({
      device_id: user.device_id || 'demo-device',
      user_id: userId,
      type: 'fall_detected',
      timestamp: new Date().toISOString(),
      location: coords ? { lat: coords.lat, lng: coords.lng } : undefined,
    });

    this.logger.log(`Demo fall triggered for ${user.name} (${user.phone})`);

    return {
      ...result,
      demo_user: { id: userId, name: user.name, phone: user.phone },
      hint: '전화를 받고 emergency 멘트를 말하면 보건소 알림까지 이어집니다.',
    };
  }
}
