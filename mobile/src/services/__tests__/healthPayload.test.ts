import { buildHealthDataRequest, averageBpm } from '../healthPayload';
import type { HealthSnapshot } from '../healthDataCollector';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const DEVICE_ID = 'fit3-test-001';

function baseSnapshot(overrides: Partial<HealthSnapshot> = {}): HealthSnapshot {
  return {
    collectedAt: '2026-05-27T12:00:00.000Z',
    heartRate: 72,
    heartRateSamples: [{ timestamp: '2026-05-27T11:59:00.000Z', bpm: 72 }],
    steps: 45,
    location: { lat: 35.6478, lng: 128.7341, accuracy: 10 },
    ...overrides,
  };
}

describe('buildHealthDataRequest', () => {
  it('maps snapshot to backend health payload', () => {
    const payload = buildHealthDataRequest(baseSnapshot(), USER_ID, DEVICE_ID);

    expect(payload).toEqual({
      device_id: DEVICE_ID,
      user_id: USER_ID,
      timestamp: '2026-05-27T12:00:00.000Z',
      heart_rate: [{ t: '2026-05-27T11:59:00.000Z', bpm: 72 }],
      steps_10min: 45,
      location: { lat: 35.6478, lng: 128.7341, accuracy: 10 },
    });
  });

  it('uses single heartRate when samples array is empty', () => {
    const payload = buildHealthDataRequest(
      baseSnapshot({ heartRateSamples: [], heartRate: 80 }),
      USER_ID,
      DEVICE_ID,
    );

    expect(payload?.heart_rate).toEqual([{ t: '2026-05-27T12:00:00.000Z', bpm: 80 }]);
  });

  it('returns null without GPS', () => {
    expect(
      buildHealthDataRequest(baseSnapshot({ location: null }), USER_ID, DEVICE_ID),
    ).toBeNull();
  });

  it('returns null without heart rate data', () => {
    expect(
      buildHealthDataRequest(
        baseSnapshot({ heartRate: null, heartRateSamples: [] }),
        USER_ID,
        DEVICE_ID,
      ),
    ).toBeNull();
  });
});

describe('averageBpm', () => {
  it('averages heart_rate samples', () => {
    const payload = buildHealthDataRequest(baseSnapshot(), USER_ID, DEVICE_ID)!;
    expect(averageBpm(payload)).toBe(72);
  });
});
