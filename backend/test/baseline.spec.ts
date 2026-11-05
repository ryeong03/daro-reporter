import { describe, expect, it } from 'vitest';
import { BaselineService } from '../src/detection/baseline.service';

describe('BaselineService', () => {
  const service = new BaselineService();

  it('falls back to 75 bpm when fewer than 10 samples exist', () => {
    expect(service.calculateBaseline()).toBe(75);
    expect(service.calculateBaseline([80, 82, 81])).toBe(75);
    expect(service.computeBaselineStats([])).toEqual({ mean: 75, sigma: 10, upperBound: 95, lowerBound: 55 });
  });

  it('computes mean and sigma for a steady signal', () => {
    const stats = service.computeBaselineStats(Array(20).fill(70));
    expect(stats).toEqual({ mean: 70, sigma: 0, upperBound: 70, lowerBound: 70 });
  });

  it('trims the top and bottom 10% so a single spike does not shift the baseline', () => {
    const history = [...Array(9).fill(70), 180];
    expect(service.computeBaselineStats(history).mean).toBe(70);
  });

  it('keeps the 2-sigma bounds symmetric around the mean', () => {
    const history = [60, 62, 64, 66, 68, 70, 72, 74, 76, 78];
    const { mean, sigma, upperBound, lowerBound } = service.computeBaselineStats(history);
    expect(upperBound - mean).toBeCloseTo(2 * sigma, 0);
    expect(mean - lowerBound).toBeCloseTo(2 * sigma, 0);
  });
});
