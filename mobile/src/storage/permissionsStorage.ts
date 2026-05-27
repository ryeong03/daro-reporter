import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@hero_permissions_setup_complete';

export async function isPermissionsSetupComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(KEY);
  return value === 'true';
}

export async function setPermissionsSetupComplete(complete: boolean): Promise<void> {
  if (complete) {
    await AsyncStorage.setItem(KEY, 'true');
  } else {
    await AsyncStorage.removeItem(KEY);
  }
}
