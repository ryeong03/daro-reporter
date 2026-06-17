type CallLogRef = { classification: string | null };
type NotificationRef = { channel: string };

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS',
  slack: 'Slack',
  call: '전화',
};

export function buildAlertActionSummary(
  status: string,
  latestCall?: CallLogRef | null,
  notifications?: NotificationRef[],
): string {
  switch (status) {
    case 'triggered':
      return 'AI 확인 전화 대기';
    case 'calling':
      return 'AI 확인 전화 진행 중';
    case 'emergency':
      return '응급 대응 진행 중';
    case 'false_alarm':
      return '오탐 처리';
    case 'safe':
    case 'closed_safe':
      if (latestCall?.classification === 'safe') return 'AI콜 안전 확인';
      return '안전 확인 완료';
    case 'closed_emergency': {
      const channels = [...new Set((notifications || []).map((n) => n.channel))]
        .map((ch) => CHANNEL_LABELS[ch] ?? ch)
        .filter(Boolean);
      if (channels.length > 0) return `보건소 알림 (${channels.join(' · ')})`;
      if (latestCall?.classification === 'emergency') return 'AI콜 응급 판정';
      return '응급 대응 완료';
    }
    default:
      return '—';
  }
}
