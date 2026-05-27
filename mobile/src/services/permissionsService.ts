import { Platform, PermissionsAndroid } from 'react-native';
import {
  getSdkStatus,
  SdkAvailabilityStatus,
  getGrantedPermissions,
} from 'react-native-health-connect';
import {
  initializeHealthConnect,
  requestHealthDataPermissions,
} from './healthConnect';
import { getCurrentLocation, requestLocationPermission } from './locationService';

export interface PermissionStatus {
  heartRate: boolean;
  steps: boolean;
  location: boolean;
}

export interface PermissionPreview {
  heartRateBpm: number | null;
  steps: number | null;
  location: { lat: number; lng: number } | null;
}

function hasGrantedRecord(
  granted: { recordType?: string; accessType?: string }[],
  recordType: string
): boolean {
  return granted.some(
    (p) => p.recordType === recordType && (p.accessType === 'read' || !p.accessType)
  );
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await getSdkStatus();
    return status === SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function checkPermissionStatus(): Promise<PermissionStatus> {
  if (Platform.OS !== 'android') {
    return { heartRate: false, steps: false, location: false };
  }

  let heartRate = false;
  let steps = false;

  try {
    const available = await isHealthConnectAvailable();
    if (available) {
      await initializeHealthConnect();
      const granted = await getGrantedPermissions();
      heartRate = hasGrantedRecord(granted, 'HeartRate');
      steps = hasGrantedRecord(granted, 'Steps');
    }
  } catch {
    // Health Connect not initialized yet
  }

  const fineLocation = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
  );

  return {
    heartRate,
    steps,
    location: fineLocation,
  };
}

/** Health Connect: 심박수·걸음수 읽기 권한을 한 번에 요청 */
export async function requestHealthPermissions(): Promise<{
  heartRate: boolean;
  steps: boolean;
}> {
  const available = await isHealthConnectAvailable();
  if (!available) {
    return { heartRate: false, steps: false };
  }

  const initialized = await initializeHealthConnect();
  if (!initialized) {
    return { heartRate: false, steps: false };
  }

  const granted = await requestHealthDataPermissions();
  return {
    heartRate: hasGrantedRecord(granted, 'HeartRate'),
    steps: hasGrantedRecord(granted, 'Steps'),
  };
}

export async function requestGpsPermission(): Promise<boolean> {
  return requestLocationPermission({ requireBackground: false });
}

export async function requestAllAppPermissions(): Promise<PermissionStatus> {
  const health = await requestHealthPermissions();
  const location = await requestGpsPermission();

  return {
    heartRate: health.heartRate,
    steps: health.steps,
    location,
  };
}

export async function loadPermissionPreview(): Promise<PermissionPreview> {
  const { readHeartRate, readSteps, initializeHealthConnect } = await import('./healthConnect');

  let heartRateBpm: number | null = null;
  let steps: number | null = null;
  let location: { lat: number; lng: number } | null = null;

  try {
    await initializeHealthConnect();
    const samples = await readHeartRate(60);
    if (samples.length > 0) {
      heartRateBpm = samples[samples.length - 1].bpm;
    }
  } catch {
    // ignore
  }

  try {
    const stepCount = await readSteps(24 * 60);
    if (stepCount > 0) steps = stepCount;
  } catch {
    // ignore
  }

  try {
    const loc = await getCurrentLocation();
    location = { lat: loc.lat, lng: loc.lng };
  } catch {
    // ignore
  }

  return { heartRateBpm, steps, location };
}

export function allPermissionsGranted(status: PermissionStatus): boolean {
  return status.heartRate && status.steps && status.location;
}
