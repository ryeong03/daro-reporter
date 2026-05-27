import {
  readHeartRate,
  readSteps,
  getLatestHeartRate,
  initializeHealthConnect,
} from './healthConnect';
import { getCurrentLocation } from './locationService';
import type { LocationData } from '../api/types';
import type { HeartRateSample } from './healthConnect';

export interface HealthSnapshot {
  collectedAt: string;
  heartRate: number | null;
  heartRateSamples: HeartRateSample[];
  steps: number;
  location: LocationData | null;
}

export interface CollectOptions {
  /** GPS 조회 포함 (배터리 절약 시 false) */
  includeLocation?: boolean;
  /** 심박 샘플 조회 기간(분) */
  heartRateSinceMinutes?: number;
  /** 걸음수 조회 기간(분) */
  stepsSinceMinutes?: number;
}

/**
 * Health Connect + Geolocation에서 최신 건강·위치 스냅샷을 한 번에 수집합니다.
 */
export async function collectLatestHealthData(
  options: CollectOptions = {}
): Promise<HealthSnapshot> {
  const {
    includeLocation = true,
    heartRateSinceMinutes = 10,
    stepsSinceMinutes = 10,
  } = options;

  const collectedAt = new Date().toISOString();

  await initializeHealthConnect();

  let heartRateSamples: HeartRateSample[] = [];
  let heartRate: number | null = null;
  let steps = 0;
  let location: LocationData | null = null;

  try {
    heartRateSamples = await readHeartRate(heartRateSinceMinutes);
    heartRate = heartRateSamples.length
      ? heartRateSamples[heartRateSamples.length - 1].bpm
      : await getLatestHeartRate();
  } catch (err) {
    console.warn('[Collector] Heart rate read failed:', err);
  }

  try {
    steps = await readSteps(stepsSinceMinutes);
  } catch (err) {
    console.warn('[Collector] Steps read failed:', err);
  }

  if (includeLocation) {
    try {
      location = await getCurrentLocation();
    } catch (err) {
      console.warn('[Collector] Location read failed:', err);
    }
  }

  return {
    collectedAt,
    heartRate,
    heartRateSamples,
    steps,
    location,
  };
}
