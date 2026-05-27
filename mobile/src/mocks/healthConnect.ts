export const SdkAvailabilityStatus = { SDK_AVAILABLE: 3, SDK_UNAVAILABLE: 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2 };

export async function initialize() { return true; }
export async function getSdkStatus() { return SdkAvailabilityStatus.SDK_AVAILABLE; }
export async function requestPermission() {
  return [
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'Steps' },
  ];
}
export async function getGrantedPermissions() { return requestPermission(); }
export function openHealthConnectSettings() {}
export async function readRecords(_type: string, _options?: unknown) {
  return { records: [] as unknown[] };
}
