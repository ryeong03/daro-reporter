import {
  initialize,
  requestPermission,
  readRecords,
} from 'react-native-health-connect';

export async function initHealthConnect(): Promise<boolean> {
  try {
    const initialized = await initialize();
    if (!initialized) {
      console.warn('[HealthConnect] Failed to initialize');
      return false;
    }

    const granted = await requestPermission([
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'Steps' },
    ]);

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
    const result = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
    });

    const samples: HeartRateSample[] = [];
    for (const record of result) {
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
    const result = await readRecords('Steps', {
      timeRangeFilter: {
        operator: 'between',
        startTime,
        endTime,
      },
    });

    let totalSteps = 0;
    for (const record of result) {
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
