import { Alert } from '../api/client';

export const ACTIVE_INCIDENT_STATUSES = ['triggered', 'calling', 'emergency'] as const;

const RESOLVED_DISPLAY_MS = 6 * 60 * 60 * 1000;

export function isActiveIncident(alert: Pick<Alert, 'status'>): boolean {
  return (ACTIVE_INCIDENT_STATUSES as readonly string[]).includes(alert.status);
}

function sortAlertsLatestFirst(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** 백엔드 findDisplayAlert 와 동일 — 가장 최근 알림만 기준 */
export function resolveDisplayAlert(alerts: Alert[]): Alert | null {
  const latest = sortAlertsLatestFirst(alerts)[0];
  if (!latest) return null;

  if (latest.status === 'false_alarm' || latest.status === 'closed_safe') {
    return null;
  }

  if (isActiveIncident(latest)) return latest;

  if (latest.status === 'closed_emergency' && latest.resolved_at) {
    const resolvedAt = new Date(latest.resolved_at).getTime();
    if (Date.now() - resolvedAt < RESOLVED_DISPLAY_MS) return latest;
  }

  return null;
}

export function findActiveIncident(alerts: Alert[]): Alert | null {
  const display = resolveDisplayAlert(alerts);
  if (!display) return null;
  return display.status === 'triggered' || display.status === 'calling' ? display : null;
}

export function findRescueAlert(alerts: Alert[]): Alert | null {
  const display = resolveDisplayAlert(alerts);
  return display?.status === 'emergency' ? display : null;
}

export function findRecentResolved(alerts: Alert[]): Alert | null {
  const display = resolveDisplayAlert(alerts);
  return display?.status === 'closed_emergency' ? display : null;
}

export function eventTypeLabel(type: string): string {
  switch (type) {
    case 'fall':
      return '낙상';
    case 'heatstroke':
      return '열사병';
    case 'syncope':
      return '실신';
    default:
      return type;
  }
}

export function alertStatusLabel(status: string): string {
  switch (status) {
    case 'triggered':
    case 'calling':
      return '응급';
    case 'emergency':
      return '구조 필요';
    case 'closed_emergency':
      return '처리완료';
    case 'closed_safe':
      return '안전 종료';
    case 'false_alarm':
      return '오탐';
    default:
      return status;
  }
}
