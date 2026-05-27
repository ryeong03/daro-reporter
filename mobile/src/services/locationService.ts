import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import type { LocationData } from '../api/types';

let watchId: number | null = null;
let currentInterval: 'normal' | 'alert' = 'normal';
let intervalTimer: ReturnType<typeof setInterval> | null = null;
let onLocationUpdate: ((location: LocationData) => void) | null = null;

const NORMAL_INTERVAL_MS = 5 * 60 * 1000;
const ALERT_INTERVAL_MS = 30 * 1000;

export interface LocationPermissionOptions {
  /** 백그라운드 위치 권한까지 요청 (모니터링 시작 시 true 권장) */
  requireBackground?: boolean;
}

export async function requestLocationPermission(
  options: LocationPermissionOptions = { requireBackground: true }
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const fineGranted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Hero 위치 권한',
      message: '어르신의 현재 위치를 확인하기 위해 위치 정보가 필요합니다.',
      buttonPositive: '허용',
      buttonNegative: '거부',
    }
  );

  if (fineGranted !== PermissionsAndroid.RESULTS.GRANTED) return false;

  if (!options.requireBackground) {
    return true;
  }

  const bgGranted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    {
      title: 'Hero 백그라운드 위치 권한',
      message: '앱이 꺼져 있을 때도 위치를 수집하려면 "항상 허용"을 선택해주세요.',
      buttonPositive: '허용',
      buttonNegative: '나중에',
    }
  );

  return bgGranted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function hasFineLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
}

function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
        });
      },
      (error) => {
        console.error('[GPS] Error:', error);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  });
}

export async function startLocationTracking(
  callback: (location: LocationData) => void
) {
  onLocationUpdate = callback;
  await scheduleUpdates('normal');
}

async function scheduleUpdates(mode: 'normal' | 'alert') {
  if (intervalTimer) clearInterval(intervalTimer);
  currentInterval = mode;

  const intervalMs = mode === 'alert' ? ALERT_INTERVAL_MS : NORMAL_INTERVAL_MS;

  try {
    const loc = await getCurrentLocation();
    onLocationUpdate?.(loc);
  } catch {}

  intervalTimer = setInterval(async () => {
    try {
      const loc = await getCurrentLocation();
      onLocationUpdate?.(loc);
    } catch (err) {
      console.error('[GPS] Interval error:', err);
    }
  }, intervalMs);

  console.log(`[GPS] Tracking mode: ${mode} (every ${intervalMs / 1000}s)`);
}

export function switchToAlertMode() {
  if (currentInterval !== 'alert') {
    scheduleUpdates('alert');
  }
}

export function switchToNormalMode() {
  if (currentInterval !== 'normal') {
    scheduleUpdates('normal');
  }
}

export function stopLocationTracking() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  if (watchId !== null) {
    Geolocation.clearWatch(watchId);
    watchId = null;
  }
  onLocationUpdate = null;
}

export { getCurrentLocation };
