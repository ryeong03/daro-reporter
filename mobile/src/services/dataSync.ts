import AsyncStorage from '@react-native-async-storage/async-storage';
import { postHealth, sendAlert } from '../api/client';
import { getCurrentLocation, switchToAlertMode, switchToNormalMode } from './locationService';
import { refreshForegroundNotificationBody } from './backgroundService';
import { getUserId, getDeviceId } from '../storage/userStorage';
import type { HealthDataRequest } from '../api/types';
import type { HealthSnapshot } from './healthDataCollector';
import { averageBpm, buildHealthDataRequest } from './healthPayload';

const OFFLINE_QUEUE_KEY = '@hero_health_post_queue_v2';
const MAX_QUEUE_SIZE = 100;

let onStateChange: ((state: string, heartRate: number, steps: number) => void) | null = null;

export function setStateChangeListener(
  listener: (state: string, heartRate: number, steps: number) => void
) {
  onStateChange = listener;
}

/** @deprecated buildHealthDataRequest 사용 */
export function buildHealthPostRequest(
  snapshot: HealthSnapshot,
  userId: string,
  deviceId: string,
): HealthDataRequest | null {
  return buildHealthDataRequest(snapshot, userId, deviceId);
}

async function queueOffline(payload: HealthDataRequest): Promise<void> {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const queue: HealthDataRequest[] = existing ? JSON.parse(existing) : [];
  queue.push(payload);

  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  console.log(`[DataSync] Queued offline (${queue.length} pending)`);
}

async function flushOfflineQueue(): Promise<void> {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!existing) return;

  const queue: HealthDataRequest[] = JSON.parse(existing);
  if (queue.length === 0) return;

  console.log(`[DataSync] Flushing ${queue.length} offline POST /health items`);
  const failed: HealthDataRequest[] = [];

  for (const payload of queue) {
    try {
      await postHealth(payload);
    } catch {
      failed.push(payload);
    }
  }

  if (failed.length > 0) {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failed));
    console.log(`[DataSync] ${failed.length} items still pending`);
  } else {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  }
}

/**
 * 수집된 스냅샷을 POST /health 로 서버에 전송합니다.
 * Foreground Service의 5분 주기 타이머에서 호출됩니다.
 */
export async function syncHealthSnapshot(snapshot: HealthSnapshot): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) {
    console.log('[DataSync] userId 없음 — POST /health 건너뜀 (온보딩 후 전송)');
    return false;
  }

  const deviceId = await getDeviceId();
  if (!deviceId) {
    console.log('[DataSync] device_id 없음 — POST /health 건너뜀 (온보딩 후 전송)');
    return false;
  }

  const payload = buildHealthDataRequest(snapshot, userId, deviceId);
  if (!payload) {
    console.log('[DataSync] 심박 또는 GPS 없음 — POST /health 건너뜀');
    return false;
  }

  const hr = averageBpm(payload);

  try {
    const response = await postHealth(payload);

    const state = response.detection?.state ?? 'normal';
    onStateChange?.(state, hr, payload.steps_10min);
    switchToNormalMode();

    await flushOfflineQueue();

    console.log(
      `[DataSync] POST /health OK — HR: ${hr}, steps: ${payload.steps_10min}, state: ${state}`
    );
    return true;
  } catch (err) {
    console.error('[DataSync] POST /health failed:', err);
    await queueOffline(payload);
    await refreshForegroundNotificationBody('네트워크 오류 · 데이터 오프라인 저장');
    return false;
  }
}

export async function sendFallAlert(): Promise<void> {
  const userId = await getUserId();
  const deviceId = await getDeviceId();
  if (!userId || !deviceId) return;

  try {
    const location = await getCurrentLocation();
    await sendAlert({
      device_id: deviceId,
      user_id: userId,
      type: 'fall_detected',
      timestamp: new Date().toISOString(),
      location: { lat: location.lat, lng: location.lng },
    });
    console.log('[DataSync] Fall alert sent');

    switchToAlertMode();
    await refreshForegroundNotificationBody('낙상 감지 · 긴급 알림 전송됨');
  } catch (err) {
    console.error('[DataSync] Fall alert failed:', err);
  }
}
