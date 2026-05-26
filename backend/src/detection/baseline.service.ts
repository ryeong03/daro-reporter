import { Injectable } from '@nestjs/common';

const DEFAULT_BASELINE_BPM = 75;

export interface BaselineResult {
  mean: number;
  sigma: number;
  upperBound: number;
  lowerBound: number;
}

@Injectable()
export class BaselineService {
  calculateBaseline(heartRateHistory?: number[]): number {
    if (!heartRateHistory || heartRateHistory.length < 10) {
      return DEFAULT_BASELINE_BPM;
    }
    const { mean } = this.computeBaselineStats(heartRateHistory);
    return mean;
  }

  computeBaselineStats(heartRateHistory: number[]): BaselineResult {
    if (!heartRateHistory || heartRateHistory.length < 10) {
      return { mean: DEFAULT_BASELINE_BPM, sigma: 10, upperBound: 95, lowerBound: 55 };
    }

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
}
