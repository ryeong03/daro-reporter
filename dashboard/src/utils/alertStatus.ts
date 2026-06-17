import { Alert } from '../api/client';

export const IN_PROGRESS_ALERT_STATUSES = ['triggered', 'calling', 'emergency'] as const;

export function isInProgressAlert(alert: Pick<Alert, 'status'>): boolean {
  return (IN_PROGRESS_ALERT_STATUSES as readonly string[]).includes(alert.status);
}

export function findInProgressAlert(alerts: Alert[]): Alert | null {
  return alerts.find(isInProgressAlert) ?? null;
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
      return '발생';
    case 'calling':
      return 'AI콜 중';
    case 'emergency':
      return '응급 대응 중';
    case 'closed_emergency':
      return '응급 처리';
    case 'closed_safe':
      return '안전 종료';
    case 'false_alarm':
      return '오탐';
    default:
      return status;
  }
}
