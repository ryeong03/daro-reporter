import { SupabaseClient } from '@supabase/supabase-js';

export type UserDisplayStatus = 'normal' | 'warning' | 'emergency';

export interface AlertStatusRef {
  id: number;
  event_type: string;
  status: string;
  created_at?: string;
  resolved_at?: string | null;
}

const IN_PROGRESS_STATUSES = ['triggered', 'calling', 'emergency'];
const RECENT_EMERGENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
/** detection engine 과 동일 — 기준선 대비 150% 이상이면 휴식 요망 */
const HIGH_HR_RATIO = 1.5;

export function isHighHeartRate(
  latestBpm: number | null | undefined,
  baselineBpm: number,
): boolean {
  if (latestBpm == null || !Number.isFinite(latestBpm)) return false;
  const baseline = baselineBpm > 0 ? baselineBpm : 75;
  return latestBpm >= baseline * HIGH_HR_RATIO;
}

/** 알림 기반 — 진행 중·최근 응급 종료는 모두 응급 */
export function mapAlertToDisplayStatus(alert?: AlertStatusRef | null): UserDisplayStatus {
  if (!alert) return 'normal';
  if (IN_PROGRESS_STATUSES.includes(alert.status) || alert.status === 'closed_emergency') {
    return 'emergency';
  }
  return 'normal';
}

/** 응급(알림) > 휴식 요망(심박 상승) > 정상 */
export function resolveUserDisplayStatus(
  displayAlert: AlertStatusRef | null,
  latestHeartRateAvg?: number | null,
  baselineBpm?: number,
): UserDisplayStatus {
  if (mapAlertToDisplayStatus(displayAlert) === 'emergency') return 'emergency';
  if (isHighHeartRate(latestHeartRateAvg, baselineBpm ?? 75)) return 'warning';
  return 'normal';
}

/** 대시보드용 — 진행 중 알림 + 최근 응급 종료(closed_emergency)까지 이상 감지로 표시 */
export async function findDisplayAlert(
  db: SupabaseClient,
  userId: string,
): Promise<AlertStatusRef | null> {
  const { data: inProgress } = await db
    .from('alerts')
    .select('id, event_type, status, created_at, resolved_at')
    .eq('user_id', userId)
    .in('status', IN_PROGRESS_STATUSES)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inProgress) return inProgress;

  const since = new Date(Date.now() - RECENT_EMERGENCY_WINDOW_MS).toISOString();
  const { data: recentEmergency } = await db
    .from('alerts')
    .select('id, event_type, status, created_at, resolved_at')
    .eq('user_id', userId)
    .eq('status', 'closed_emergency')
    .gte('resolved_at', since)
    .order('resolved_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return recentEmergency ?? null;
}
