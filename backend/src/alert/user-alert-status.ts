import { SupabaseClient } from '@supabase/supabase-js';
import { isPinnedRestName } from '../config/demo-display';

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

export function isInProgressAlert(alert?: AlertStatusRef | null): boolean {
  return !!alert && IN_PROGRESS_STATUSES.includes(alert.status);
}

/** 응급(진행 중·최근 종료) > 휴식 고정 > 휴식(심박) > 정상 */
export function resolveUserDisplayStatus(
  displayAlert: AlertStatusRef | null,
  latestHeartRateAvg?: number | null,
  baselineBpm?: number,
  userName?: string | null,
): UserDisplayStatus {
  if (isInProgressAlert(displayAlert)) return 'emergency';

  if (displayAlert?.status === 'closed_emergency') return 'emergency';

  if (isPinnedRestName(userName)) return 'warning';

  if (isHighHeartRate(latestHeartRateAvg, baselineBpm ?? 75)) return 'warning';

  return 'normal';
}

/** 대시보드용 — 진행 중 알림 + 최근 응급 종료(closed_emergency) */
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
