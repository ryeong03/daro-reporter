const DEFAULT_BASELINE_BPM = 75;

export interface BaselineResult {
  mean: number;
  sigma: number;
  upperBound: number;
  lowerBound: number;
}

/**
 * 기준선 산출: 최근 3일 안정 시 심박의 평균 ± 2σ
 * 데이터 부족 시 75bpm 임시 기준선 (7일 후 자동 갱신)
 */
export function calculateBaseline(heartRateHistory?: number[]): number {
  if (!heartRateHistory || heartRateHistory.length < 10) {
    return DEFAULT_BASELINE_BPM;
  }

  const { mean } = computeBaselineStats(heartRateHistory);
  return mean;
}

/**
 * 기준선 + 2σ 범위 산출 (감지 로직에서 사용)
 */
export function computeBaselineStats(heartRateHistory: number[]): BaselineResult {
  if (!heartRateHistory || heartRateHistory.length < 10) {
    return { mean: DEFAULT_BASELINE_BPM, sigma: 10, upperBound: 95, lowerBound: 55 };
  }

  // 상하위 10% 트리밍 (이상치 제거)
  const sorted = [...heartRateHistory].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  const mean = trimmed.reduce((acc, v) => acc + v, 0) / trimmed.length;
  const variance = trimmed.reduce((acc, v) => acc + (v - mean) ** 2, 0) / trimmed.length;
  const sigma = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 10) / 10,
    sigma: Math.round(sigma * 10) / 10,
    upperBound: Math.round((mean + 2 * sigma) * 10) / 10,
    lowerBound: Math.round((mean - 2 * sigma) * 10) / 10,
  };
}
