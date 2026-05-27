import { Platform } from 'react-native';
import {
  startForegroundService,
  stopForegroundService,
  isForegroundServiceActive,
} from './backgroundService';
import { setStateChangeListener } from './dataSync';

let sessionActive = false;

export type MonitoringStateListener = (
  state: string,
  heartRate: number,
  steps: number
) => void;

/**
 * 권한 허용 후 백그라운드 모니터링을 시작합니다.
 * Notifee Foreground Service 알림 + Health Connect/GPS 주기 수집이 동작합니다.
 */
export async function startHealthMonitoringSession(
  onStateChange?: MonitoringStateListener
): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (sessionActive && isForegroundServiceActive()) return;

  if (onStateChange) {
    setStateChangeListener(onStateChange);
  }

  await startForegroundService();
  sessionActive = true;
  console.log('[HealthMonitoring] Session started');
}

export async function stopHealthMonitoringSession(): Promise<void> {
  if (!sessionActive && Platform.OS === 'android') {
    await stopForegroundService();
    return;
  }

  await stopForegroundService();
  sessionActive = false;
  setStateChangeListener(() => {});
  console.log('[HealthMonitoring] Session stopped');
}

export function isHealthMonitoringSessionActive(): boolean {
  return sessionActive;
}
