const DEFAULT_BASELINE_BPM = 75;

/**
 * 과거 7일 심박 데이터로 개인 기준선 산출.
 * 데이터가 없거나 부족하면 75bpm 임시 기준선 사용.
 */
export function calculateBaseline(heartRateHistory?: number[]): number {
  if (!heartRateHistory || heartRateHistory.length < 10) {
    return DEFAULT_BASELINE_BPM;
  }

  const sorted = [...heartRateHistory].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  const sum = trimmed.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / trimmed.length) * 10) / 10;
}
