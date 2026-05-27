import { DeviceEventEmitter } from 'react-native';
import type { HealthSnapshot } from './healthDataCollector';

export const HEALTH_SNAPSHOT_EVENT = 'hero:health-snapshot';

export function emitHealthSnapshot(snapshot: HealthSnapshot): void {
  DeviceEventEmitter.emit(HEALTH_SNAPSHOT_EVENT, snapshot);
}

export function subscribeHealthSnapshots(
  listener: (snapshot: HealthSnapshot) => void
): () => void {
  const subscription = DeviceEventEmitter.addListener(HEALTH_SNAPSHOT_EVENT, listener);
  return () => subscription.remove();
}
