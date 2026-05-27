import notifee from '@notifee/react-native';
import { collectLatestHealthData } from './healthDataCollector';
import { initializeHealthConnect } from './healthConnect';
import { emitHealthSnapshot } from './healthMonitorEvents';
import { syncHealthSnapshot } from './dataSync';

/** 로컬 수집·UI 갱신 주기 (ms) */
export const HEALTH_POLL_INTERVAL_MS = 10_000;

/** POST /health 서버 전송 주기 (ms) — 5분 (5~10분 권장 범위) */
export const HEALTH_SYNC_INTERVAL_MS = 5 * 60 * 1000;

let pollTimer: ReturnType<typeof setInterval> | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let serviceRunning = false;
let stopServiceResolver: (() => void) | null = null;

async function refreshNotification(snapshot: Awaited<ReturnType<typeof collectLatestHealthData>>) {
  const { refreshForegroundNotificationFromSnapshot } = await import('./backgroundService');
  await refreshForegroundNotificationFromSnapshot(snapshot);
}

/** 10초마다: Health Connect 심박·걸음 로컬 수집 + 알림 본문 갱신 */
async function runCollectionTick(): Promise<void> {
  if (!serviceRunning) return;

  try {
    const snapshot = await collectLatestHealthData({ includeLocation: false });
    emitHealthSnapshot(snapshot);
    await refreshNotification(snapshot);

    console.log(
      `[ForegroundTask] Collected — HR: ${snapshot.heartRate ?? '-'}, steps: ${snapshot.steps}`
    );
  } catch (err) {
    console.error('[ForegroundTask] Collection tick failed:', err);
  }
}

/** 5분마다: GPS 포함 수집 → POST /health 전송 */
async function runServerSyncTick(): Promise<void> {
  if (!serviceRunning) return;

  try {
    const snapshot = await collectLatestHealthData({
      includeLocation: true,
      heartRateSinceMinutes: 15,
      stepsSinceMinutes: 15,
    });
    emitHealthSnapshot(snapshot);
    await refreshNotification(snapshot);

    const sent = await syncHealthSnapshot(snapshot);
    console.log(
      `[ForegroundTask] Server sync — HR: ${snapshot.heartRate ?? '-'}, steps: ${snapshot.steps}, GPS: ${snapshot.location ? 'yes' : 'no'}, sent: ${sent}`
    );
  } catch (err) {
    console.error('[ForegroundTask] Server sync failed:', err);
  }
}

function clearPollTimer(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function clearSyncTimer(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

function stopRunner(): void {
  serviceRunning = false;
  clearPollTimer();
  clearSyncTimer();
  if (stopServiceResolver) {
    stopServiceResolver();
    stopServiceResolver = null;
  }
}

/**
 * index.js에서 앱 시작 시 1회 등록합니다.
 * Notifee Foreground Service가 시작되면:
 *  - 10초 주기: Health Connect 로컬 수집
 *  - 5분 주기: GPS + POST /health 서버 전송
 */
export function registerForegroundServiceRunner(): void {
  notifee.registerForegroundService(() => {
    return new Promise<void>((resolve) => {
      stopServiceResolver = resolve;
      serviceRunning = true;

      void (async () => {
        await initializeHealthConnect();

        await runCollectionTick();
        await runServerSyncTick();

        pollTimer = setInterval(() => {
          if (serviceRunning) {
            void runCollectionTick();
          }
        }, HEALTH_POLL_INTERVAL_MS);

        syncTimer = setInterval(() => {
          if (serviceRunning) {
            void runServerSyncTick();
          }
        }, HEALTH_SYNC_INTERVAL_MS);

        console.log(
          `[ForegroundTask] Started — collect: ${HEALTH_POLL_INTERVAL_MS / 1000}s, POST /health: ${HEALTH_SYNC_INTERVAL_MS / 60_000}min`
        );
      })();
    });
  });
}

export function isForegroundTaskRunning(): boolean {
  return serviceRunning;
}

export function stopForegroundTaskRunner(): void {
  stopRunner();
}
