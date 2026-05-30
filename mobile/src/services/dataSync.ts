import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendHealthData, sendAlert } from '../api/client';
import { readHeartRate, readSteps } from './healthConnect';
import { getCurrentLocation, switchToAlertMode, switchToNormalMode } from './locationService';
import { updateNotification } from './backgroundService';
import { getDeviceId, getUserId } from '../storage/userStorage';
import type { HealthDataRequest, AlertRequest } from '../api/types';

const OFFLINE_QUEUE_KEY = '@hero_offline_queue';
/** 서버 감지(5분·2분 타이머) — 10분이면 1단계 지속을 놓칠 수 있음 */
const SYNC_INTERVAL_MS = 2 * 60 * 1000;

let syncTimer: ReturnType<typeof setInterval> | null = null;
let onStateChange: ((state: string, heartRate: number, steps: number) => void) | null = null;

export function setStateChangeListener(
  listener: (state: string, heartRate: number, steps: number) => void
) {
  onStateChange = listener;
}

export async function startDataSync() {
  await syncOnce();

  syncTimer = setInterval(async () => {
    await syncOnce();
  }, SYNC_INTERVAL_MS);

  console.log(`[DataSync] Started (every ${SYNC_INTERVAL_MS / 1000}s)`);
}

export function stopDataSync() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

async function syncOnce() {
  const userId = await getUserId();
  const deviceId = await getDeviceId();
  if (!userId || !deviceId) return;

  const heartRateSamples = await readHeartRate(10);
  const steps = await readSteps(10);

  if (heartRateSamples.length === 0) {
    console.log('[DataSync] No heart rate data, skipping');
    return;
  }

  let location;
  try {
    location = await getCurrentLocation();
  } catch {
    console.warn('[DataSync] GPS unavailable, skipping sync');
    return;
  }

  const payload: HealthDataRequest = {
    device_id: deviceId,
    user_id: userId,
    timestamp: new Date().toISOString(),
    heart_rate: heartRateSamples.map((s) => ({ t: s.timestamp, bpm: s.bpm })),
    steps_10min: steps,
    location,
  };

  try {
    const response = await sendHealthData(payload);

    const avgBpm = Math.round(
      heartRateSamples.reduce((sum, s) => sum + s.bpm, 0) / heartRateSamples.length
    );

    onStateChange?.(response.detection.state, avgBpm, steps);

    if (response.detection.triggered) {
      switchToAlertMode();
      await updateNotification(
        `⚠️ 이상 감지 — AI 확인 전화 진행 중 (심박: ${avgBpm} BPM)`
      );
    } else if (response.detection.state === 'normal') {
      switchToNormalMode();
      await updateNotification(`심박: ${avgBpm} BPM · 걸음: ${steps}보`);
    }

    await flushOfflineQueue();

    console.log(`[DataSync] Sent — state: ${response.detection.state}, HR: ${avgBpm}, steps: ${steps}`);
  } catch (err) {
    console.error('[DataSync] Failed, queueing offline:', err);
    await queueOffline(payload);
  }
}

async function queueOffline(payload: HealthDataRequest) {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const queue: HealthDataRequest[] = existing ? JSON.parse(existing) : [];
  queue.push(payload);

  if (queue.length > 100) queue.splice(0, queue.length - 100);

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function flushOfflineQueue() {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!existing) return;

  const queue: HealthDataRequest[] = JSON.parse(existing);
  if (queue.length === 0) return;

  console.log(`[DataSync] Flushing ${queue.length} offline items`);
  const failed: HealthDataRequest[] = [];

  for (const payload of queue) {
    try {
      await sendHealthData(payload);
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

export async function sendFallAlert() {
  const userId = await getUserId();
  const deviceId = await getDeviceId();
  if (!userId || !deviceId) return;

  try {
    const location = await getCurrentLocation();
    const payload: AlertRequest = {
      device_id: deviceId,
      user_id: userId,
      type: 'fall_detected',
      timestamp: new Date().toISOString(),
      location: { lat: location.lat, lng: location.lng },
    };

    const response = await sendAlert(payload);
    console.log('[DataSync] Fall alert sent:', response);

    switchToAlertMode();
    await updateNotification('🚨 낙상 감지 — 긴급 알림 전송됨');
  } catch (err) {
    console.error('[DataSync] Fall alert failed:', err);
  }
}
