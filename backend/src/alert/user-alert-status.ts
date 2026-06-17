import { SupabaseClient } from '@supabase/supabase-js';
import { isPinnedRestName } from '../config/demo-display';

export type UserDisplayStatus = 'normal' | 'warning' | 'emergency' | 'rescue' | 'resolved';

export interface AlertStatusRef {
  id: number;
  event_type: string;
  status: string;
  created_at?: string;
  resolved_at?: string | null;
}

/** 시연 중·대응 중 알림 */
export const ACTIVE_INCIDENT_STATUSES = ['triggered', 'calling', 'emergency'] as const;

const RESOLVED_DISPLAY_MS = 6 * 60 * 60 * 1000;
const STALE_INCIDENT_MS = 2 * 60 * 60 * 1000;
const HIGH_HR_RATIO = 1.5;

export function isHighHeartRate(
  latestBpm: number | null | undefined,
  baselineBpm: number,
): boolean {
  if (latestBpm == null || !Number.isFinite(latestBpm)) return false;
  const baseline = baselineBpm > 0 ? baselineBpm : 75;
  return latestBpm >= baseline * HIGH_HR_RATIO;
}

export function isActiveIncident(alert?: AlertStatusRef | null): boolean {
  return !!alert && (ACTIVE_INCIDENT_STATUSES as readonly string[]).includes(alert.status);
}

/**
 * 시연 플로우:
 * triggered/calling → 응급 | emergency → 구조 필요 | closed_emergency(최근) → 처리완료 | 그 외 정상
 */
export function resolveUserDisplayStatus(
  displayAlert: AlertStatusRef | null,
  latestHeartRateAvg?: number | null,
  baselineBpm?: number,
  userName?: string | null,
): UserDisplayStatus {
  if (displayAlert) {
    if (displayAlert.status === 'triggered' || displayAlert.status === 'calling') {
      return 'emergency';
    }
    if (displayAlert.status === 'emergency') return 'rescue';
    if (displayAlert.status === 'closed_emergency') return 'resolved';
  }

  if (isPinnedRestName(userName)) return 'warning';
  if (isHighHeartRate(latestHeartRateAvg, baselineBpm ?? 75)) return 'warning';

  return 'normal';
}

export function resolveStatusLabel(
  displayAlert: AlertStatusRef | null,
  displayStatus: UserDisplayStatus,
  userName?: string | null,
): string {
  switch (displayAlert?.status) {
    case 'triggered':
    case 'calling':
      return '응급';
    case 'emergency':
      return '구조 필요';
    case 'closed_emergency':
      return '처리완료';
    default:
      break;
  }

  if (displayStatus === 'warning') return '휴식';
  return '정상';
}

function isStaleIncident(alert: AlertStatusRef): boolean {
  if (!alert.created_at) return false;
  if (!(ACTIVE_INCIDENT_STATUSES as readonly string[]).includes(alert.status)) return false;
  return Date.now() - new Date(alert.created_at).getTime() > STALE_INCIDENT_MS;
}

/** 최신 알림이 종료됐는데 이전 triggered/emergency 가 남아 있으면 정리 */
async function closeOrphanIncidents(
  db: SupabaseClient,
  userId: string,
  latest: AlertStatusRef,
): Promise<void> {
  const terminalLatest =
    latest.status === 'false_alarm' ||
    latest.status === 'closed_safe' ||
    (latest.status === 'closed_emergency' &&
      latest.resolved_at != null &&
      Date.now() - new Date(latest.resolved_at).getTime() >= RESOLVED_DISPLAY_MS);

  if (!terminalLatest) return;

  const now = new Date().toISOString();
  await db
    .from('alerts')
    .update({ status: 'false_alarm', resolved_at: now })
    .eq('user_id', userId)
    .in('status', ['triggered', 'calling', 'emergency']);
}

/** 가장 최근 알림 기준 — false_alarm 이후엔 정상, 오래된 미종료 알림은 자동 정리 */
export async function findDisplayAlert(
  db: SupabaseClient,
  userId: string,
): Promise<AlertStatusRef | null> {
  const { data: latest } = await db
    .from('alerts')
    .select('id, event_type, status, created_at, resolved_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) return null;

  await closeOrphanIncidents(db, userId, latest);

  if (latest.status === 'false_alarm' || latest.status === 'closed_safe') {
    return null;
  }

  if (isStaleIncident(latest)) {
    const now = new Date().toISOString();
    await db
      .from('alerts')
      .update({ status: 'false_alarm', resolved_at: now })
      .eq('id', latest.id);
    return null;
  }

  if ((ACTIVE_INCIDENT_STATUSES as readonly string[]).includes(latest.status)) {
    return latest;
  }

  if (latest.status === 'closed_emergency' && latest.resolved_at) {
    const resolvedAt = new Date(latest.resolved_at).getTime();
    if (Date.now() - resolvedAt < RESOLVED_DISPLAY_MS) return latest;
  }

  return null;
}
