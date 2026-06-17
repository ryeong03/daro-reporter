const DEFAULT_PINNED_REST = ['장어르신', '김어르신'];

/** 시연용 고정 휴식 심박수 — 대시보드 표시값 */
const DEFAULT_PINNED_REST_BPM: Record<string, number> = {
  장어르신: 92,
  김어르신: 83,
};

function parseNameList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw?.trim()) return fallback;
  const parsed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

export function getPinnedRestNames(): string[] {
  return parseNameList(process.env.DEMO_PINNED_REST_NAMES, DEFAULT_PINNED_REST);
}

export function isPinnedRestName(name?: string | null): boolean {
  const n = name?.trim();
  return !!n && getPinnedRestNames().includes(n);
}

export function getPinnedRestHeartRate(name?: string | null): number | null {
  const n = name?.trim();
  if (!n) return null;
  const bpm = DEFAULT_PINNED_REST_BPM[n];
  return bpm != null ? bpm : null;
}
