import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  USER_ID: '@hero_user_id',
  USER_NAME: '@hero_user_name',
  DEVICE_ID: '@hero_device_id',
  PHONE: '@hero_phone',
  BASELINE_BPM: '@hero_baseline_bpm',
} as const;

export async function saveUser(user: {
  id: string;
  name: string;
  device_id: string;
  phone: string;
  baseline_bpm: number;
}) {
  await AsyncStorage.multiSet([
    [KEYS.USER_ID, user.id],
    [KEYS.USER_NAME, user.name],
    [KEYS.DEVICE_ID, user.device_id],
    [KEYS.PHONE, user.phone],
    [KEYS.BASELINE_BPM, String(user.baseline_bpm)],
  ]);
}

export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.USER_ID);
}

export async function getUserName(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.USER_NAME);
}

export async function getDeviceId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.DEVICE_ID);
}

export async function getPhone(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.PHONE);
}

export async function getBaselineBpm(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.BASELINE_BPM);
  return val ? parseFloat(val) : 75;
}

export async function clearUser() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
