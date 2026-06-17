import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../database/supabase.service';
import { findDisplayAlert, resolveUserDisplayStatus } from '../alert/user-alert-status';
import * as crypto from 'crypto';

interface GuardianPayload {
  guardianId: number;
  phone: string;
  name: string;
  type: 'normal' | 'emergency';
}

@Injectable()
export class GuardianService {
  private readonly logger = new Logger(GuardianService.name);

  // 긴급 토큰 저장소 (token → { guardianId, userId, alertId, expiresAt })
  private readonly emergencyTokens = new Map<string, {
    guardianId: number;
    userId: string;
    alertId: number;
    expiresAt: number;
  }>();

  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
  ) {}

  /**
   * A. 전번+이름 로그인
   * guardians 테이블에서 phone+name 매칭 → JWT 발급
   */
  async loginByPhoneAndName(phone: string, name: string) {
    const db = this.supabaseService.db;

    const { data: guardian, error } = await db
      .from('guardians')
      .select('id, name, phone, user_id, relation')
      .eq('phone', phone)
      .eq('name', name)
      .single();

    if (error || !guardian) {
      return null;
    }

    const payload: GuardianPayload = {
      guardianId: guardian.id,
      phone: guardian.phone,
      name: guardian.name,
      type: 'normal',
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      guardian: {
        id: guardian.id,
        name: guardian.name,
        relation: guardian.relation,
      },
    };
  }

  /**
   * B. 긴급 SMS 용 일회성 토큰 생성
   * emergency.service에서 SMS 보낼 때 호출
   */
  generateEmergencyToken(guardianId: number, userId: string, alertId: number): string {
    const token = crypto.randomBytes(32).toString('hex');

    this.emergencyTokens.set(token, {
      guardianId,
      userId,
      alertId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24시간 유효
    });

    return token;
  }

  /**
   * B. 긴급 토큰 검증 → 임시 JWT 발급
   */
  async verifyEmergencyToken(token: string) {
    const data = this.emergencyTokens.get(token);

    if (!data) return null;
    if (Date.now() > data.expiresAt) {
      this.emergencyTokens.delete(token);
      return null;
    }

    // 토큰 사용 후 삭제 (일회성)
    this.emergencyTokens.delete(token);

    const db = this.supabaseService.db;
    const { data: guardian } = await db
      .from('guardians')
      .select('id, name, phone')
      .eq('id', data.guardianId)
      .single();

    if (!guardian) return null;

    const payload: GuardianPayload = {
      guardianId: guardian.id,
      phone: guardian.phone,
      name: guardian.name,
      type: 'emergency',
    };

    const jwt = this.jwtService.sign(payload, { expiresIn: '24h' });

    return {
      token: jwt,
      alertId: data.alertId,
      userId: data.userId,
      guardian: { id: guardian.id, name: guardian.name },
    };
  }

  /**
   * 보호자에게 연결된 어르신 목록
   */
  async getLinkedUsers(token: string) {
    const payload = this.verifyJwt(token);
    const db = this.supabaseService.db;

    // 해당 보호자의 phone으로 연결된 모든 농업인 조회
    const { data: guardianRecords } = await db
      .from('guardians')
      .select('user_id, relation')
      .eq('phone', payload.phone);

    if (!guardianRecords || guardianRecords.length === 0) {
      return { users: [] };
    }

    const userIds = guardianRecords.map((g) => g.user_id);

    const { data: users } = await db
      .from('users')
      .select('id, name, phone, baseline_bpm, created_at')
      .in('id', userIds);

    const usersWithRelation = (users || []).map((user) => {
      const guardianRecord = guardianRecords.find((g) => g.user_id === user.id);
      return { ...user, relation: guardianRecord?.relation || null };
    });

    return { users: usersWithRelation };
  }

  /**
   * 특정 어르신 상태 상세 조회 (권한 체크 포함)
   */
  async getUserStatus(token: string, userId: string) {
    const payload = this.verifyJwt(token);
    await this.checkAccess(payload.phone, userId);

    const db = this.supabaseService.db;

    const { data: user } = await db
      .from('users')
      .select('id, name, phone, baseline_bpm')
      .eq('id', userId)
      .single();

    if (!user) throw new UnauthorizedException('접근 권한이 없습니다');

    // 최신 헬스 데이터
    const { data: latestHealth } = await db
      .from('health_data')
      .select('heart_rate_avg, steps_10min, lat, lng, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    const displayAlert = await findDisplayAlert(db, userId);
    const latestHeartRate =
      latestHealth?.heart_rate_avg != null ? Number(latestHealth.heart_rate_avg) : null;

    return {
      user,
      status: resolveUserDisplayStatus(
        displayAlert,
        latestHeartRate,
        user.baseline_bpm,
        user.name,
      ),
      latest_health: latestHealth || null,
      active_alert: displayAlert,
    };
  }

  /**
   * 어르신 알림 이력 조회
   */
  async getUserAlerts(token: string, userId: string) {
    const payload = this.verifyJwt(token);
    await this.checkAccess(payload.phone, userId);

    const db = this.supabaseService.db;

    const { data: alerts } = await db
      .from('alerts')
      .select('id, event_type, status, created_at, resolved_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return { alerts: alerts || [] };
  }

  private verifyJwt(token: string): GuardianPayload {
    try {
      return this.jwtService.verify<GuardianPayload>(token);
    } catch {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요');
    }
  }

  private async checkAccess(guardianPhone: string, userId: string) {
    const { data } = await this.supabaseService.db
      .from('guardians')
      .select('id')
      .eq('phone', guardianPhone)
      .eq('user_id', userId)
      .single();

    if (!data) {
      throw new UnauthorizedException('해당 어르신에 대한 접근 권한이 없습니다');
    }
  }
}
