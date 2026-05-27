import type { HealthDataRequest } from '../api/types';
import type { HealthSnapshot } from './healthDataCollector';

/**
 * HealthSnapshot → POST /health 바디 (backend healthPayloadSchema 와 동일 형식).
 * 심박·GPS·device_id 가 없으면 null.
 */
export function buildHealthDataRequest(
  snapshot: HealthSnapshot,
  userId: string,
  deviceId: string,
): HealthDataRequest | null {
  if (!snapshot.location) {
    return null;
  }

  let heart_rate: HealthDataRequest['heart_rate'];

  if (snapshot.heartRateSamples.length > 0) {
    heart_rate = snapshot.heartRateSamples.map((s) => ({
      t: s.timestamp,
      bpm: s.bpm,
    }));
  } else if (snapshot.heartRate != null) {
    heart_rate = [{ t: snapshot.collectedAt, bpm: snapshot.heartRate }];
  } else {
    return null;
  }

  return {
    device_id: deviceId,
    user_id: userId,
    timestamp: snapshot.collectedAt,
    heart_rate,
    steps_10min: snapshot.steps,
    location: {
      lat: snapshot.location.lat,
      lng: snapshot.location.lng,
      accuracy: snapshot.location.accuracy ?? 10,
    },
  };
}

export function averageBpm(payload: HealthDataRequest): number {
  const sum = payload.heart_rate.reduce((acc, s) => acc + s.bpm, 0);
  return Math.round(sum / payload.heart_rate.length);
}
