/** 시연용 고정 표시값 — 상태(휴식/정상)는 심박·기준선으로 자동 판정 */
const PINNED_HEART_RATE: Record<string, number> = {
  장어르신: 92,
  김어르신: 83,
  도유연: 77,
  한희홍: 93,
  이채린: 74,
};

const PINNED_AGE: Record<string, number> = {
  임현진: 24,
  이채린: 26,
  도유연: 77,
  한희홍: 82,
};

/** ISO 8601 — 대시보드 최근 업데이트 표시용 */
const PINNED_LAST_HEALTH_AT: Record<string, string> = {
  도유연: '2026-06-16T12:00:00.000Z', // 2026-06-16 21:00 KST
  한희홍: '2026-06-16T00:00:00.000Z', // 2026-06-16 09:00 KST
};

export function getPinnedHeartRate(name?: string | null): number | null {
  const n = name?.trim();
  if (!n) return null;
  const bpm = PINNED_HEART_RATE[n];
  return bpm != null ? bpm : null;
}

/** @deprecated use getPinnedHeartRate */
export function getPinnedRestHeartRate(name?: string | null): number | null {
  return getPinnedHeartRate(name);
}

export function getPinnedAge(name?: string | null): number | null {
  const n = name?.trim();
  if (!n) return null;
  const age = PINNED_AGE[n];
  return age != null ? age : null;
}

export function getPinnedLastHealthAt(name?: string | null): string | null {
  const n = name?.trim();
  if (!n) return null;
  return PINNED_LAST_HEALTH_AT[n] ?? null;
}

export function birthDateForPinnedAge(age: number): string {
  const year = new Date().getFullYear() - age;
  return `${year}-06-17`;
}
