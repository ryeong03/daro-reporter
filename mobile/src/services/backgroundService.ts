import notifee, { AndroidForegroundServiceType, AndroidImportance } from '@notifee/react-native';
import { PermissionsAndroid, Platform } from 'react-native';
import { initHealthConnect } from './healthConnect';
import { requestLocationPermission } from './locationService';
import {
  isForegroundTaskRunning,
  stopForegroundTaskRunner,
} from './foregroundTask';
import type { HealthSnapshot } from './healthDataCollector';

export const CHANNEL_ID = 'hero-monitoring';
export const NOTIFICATION_ID = 'hero-foreground';
export const FOREGROUND_NOTIFICATION_TITLE = '안전 모니터링 동작 중';

const FOREGROUND_NOTIFICATION_BODY =
  'Galaxy Fit3 심박·걸음·위치를 백그라운드에서 수집합니다';

let serviceStartRequested = false;

export async function createNotificationChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Hero 안전 모니터링',
    description: '백그라운드 건강·위치 수집 서비스',
    importance: AndroidImportance.LOW,
  });
}

function buildForegroundNotification(body: string = FOREGROUND_NOTIFICATION_BODY) {
  return {
    id: NOTIFICATION_ID,
    title: FOREGROUND_NOTIFICATION_TITLE,
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      autoCancel: false,
      onlyAlertOnce: true,
      smallIcon: 'ic_notification',
      color: '#2d6a4f',
      pressAction: { id: 'default' },
      foregroundServiceTypes: [
        AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_HEALTH,
        AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION,
      ],
    },
  };
}

export function formatMonitoringNotificationBody(snapshot: HealthSnapshot): string {
  const hrPart =
    snapshot.heartRate != null ? `심박 ${snapshot.heartRate} BPM` : '심박 대기 중';
  const stepsPart = `걸음 ${snapshot.steps.toLocaleString()}보`;
  const locPart = snapshot.location
    ? `위치 ${snapshot.location.lat.toFixed(4)}, ${snapshot.location.lng.toFixed(4)}`
    : '위치 수집 중';
  return `${hrPart} · ${stepsPart} · ${locPart}`;
}

async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;

  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );
  if (granted) return;

  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, {
    title: 'Hero 알림 권한',
    message: '백그라운드 안전 모니터링 상태를 표시하려면 알림 권한이 필요합니다.',
    buttonPositive: '허용',
    buttonNegative: '거부',
  });
}

/**
 * Foreground Service 시작 + 고정 알림 표시.
 * registerForegroundServiceRunner()가 index.js에서 먼저 등록되어 있어야 합니다.
 */
export async function startForegroundService(): Promise<void> {
  if (Platform.OS !== 'android') {
    console.log('[ForegroundService] Skipped — not Android');
    return;
  }

  if (serviceStartRequested && isForegroundTaskRunning()) {
    console.log('[ForegroundService] Already running');
    return;
  }

  serviceStartRequested = true;

  try {
    await requestNotificationPermission();
    await requestLocationPermission({ requireBackground: true });
    await initHealthConnect();
    await createNotificationChannel();

    await notifee.displayNotification(buildForegroundNotification());

    console.log('[ForegroundService] Started —', FOREGROUND_NOTIFICATION_TITLE);
  } catch (err) {
    serviceStartRequested = false;
    throw err;
  }
}

/** 제목(안전 모니터링 동작 중)은 유지하고 본문만 갱신 */
export async function refreshForegroundNotificationBody(body: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.displayNotification(buildForegroundNotification(body));
}

export async function refreshForegroundNotificationFromSnapshot(
  snapshot: HealthSnapshot
): Promise<void> {
  await refreshForegroundNotificationBody(formatMonitoringNotificationBody(snapshot));
}

export async function stopForegroundService(): Promise<void> {
  serviceStartRequested = false;
  stopForegroundTaskRunner();
  await notifee.stopForegroundService();
  console.log('[ForegroundService] Stopped');
}

export function isForegroundServiceActive(): boolean {
  return isForegroundTaskRunning();
}
