import {
  initialize,
  requestPermission,
  readRecords,
  getGrantedPermissions,
} from 'react-native-health-connect';
import type { Permission } from 'react-native-health-connect';

const HEALTH_READ_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'Steps' },
];

export async function initializeHealthConnect(): Promise<boolean> {
  try {
    const initialized = await initialize();
    if (!initialized) {
      console.warn('[HealthConnect] Failed to initialize');
    }
    return initialized;
  } catch (err) {
    console.error('[HealthConnect] Initialize error:', err);
    return false;
  }
}

export async function requestHealthDataPermissions(): Promise<Permission[]> {
  return requestPermission(HEALTH_READ_PERMISSIONS);
}

export async function hasHealthDataPermissions(): Promise<boolean> {
  try {
    const granted = await getGrantedPermissions();
    const types = granted.map((p) => p.recordType);
    return types.includes('HeartRate') && types.includes('Steps');
  } catch {
    return false;
  }
}

/** 초기화 + 권한 확인 (이미 허용된 경우 재요청하지 않음) */
export async function initHealthConnect(): Promise<boolean> {
  try {
    const initialized = await initializeHealthConnect();
    if (!initialized) return false;

    if (await hasHealthDataPermissions()) {
      return true;
    }

    const granted = await requestHealthDataPermissions();
    console.log('[HealthConnect] Permissions granted:', granted);
    return granted.length > 0;
  } catch (err) {
    console.error('[HealthConnect] Init error:', err);
    return false;
  }
}

export interface HeartRateSample {
  timestamp: string;
  bpm: number;
}

export async function readHeartRate(sinceMinutes: number = 10): Promise<HeartRateSample[]> {
  const now = new Date();
  const startTime = new Date(now.getTime() - sinceMinutes * 60 * 1000).toISOString();
  const endTime = now.toISOString();

  try {
    const { records } = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
    });

    const samples: HeartRateSample[] = [];
    for (const record of records) {
      if ('samples' in record && Array.isArray(record.samples)) {
        for (const sample of record.samples) {
          samples.push({
            timestamp: sample.time || record.startTime,
            bpm: sample.beatsPerMinute,
          });
        }
      }
    }

    return samples;
  } catch (err) {
    console.error('[HealthConnect] readHeartRate error:', err);
    return [];
  }
}

export async function readSteps(sinceMinutes: number = 10): Promise<number> {
  const now = new Date();
  const startTime = new Date(now.getTime() - sinceMinutes * 60 * 1000).toISOString();
  const endTime = now.toISOString();

  try {
    const { records } = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
    });

    let totalSteps = 0;
    for (const record of records) {
      if ('count' in record) {
        totalSteps += (record as any).count;
      }
    }

    return totalSteps;
  } catch (err) {
    console.error('[HealthConnect] readSteps error:', err);
    return 0;
  }
}

export async function getLatestHeartRate(): Promise<number | null> {
  const samples = await readHeartRate(2);
  if (samples.length === 0) return null;
  return samples[samples.length - 1].bpm;
}
