/** 시연용 고정 심박수 표시값 — 상태(휴식/정상)는 기준선×1.5 로 자동 판정 */
const DEFAULT_PINNED_REST_BPM: Record<string, number> = {
  장어르신: 92,
  김어르신: 83,
};

export function getPinnedRestHeartRate(name?: string | null): number | null {
  const n = name?.trim();
  if (!n) return null;
  const bpm = DEFAULT_PINNED_REST_BPM[n];
  return bpm != null ? bpm : null;
}
