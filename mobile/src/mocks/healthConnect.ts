export async function initialize() { return true; }
export async function requestPermission() { return [{ accessType: 'read', recordType: 'HeartRate' }]; }
export async function readRecords() { return []; }
