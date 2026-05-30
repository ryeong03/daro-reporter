package app.hero.heronative.health

import android.content.Context

/** Health Connect에 워치 심박 샘플이 최근에 들어왔는지 확인 */
suspend fun hasRecentWatchHeartRate(
    healthManager: HealthConnectManager,
    sinceMinutes: Long = 10,
): Boolean {
    if (!healthManager.isAvailable || !healthManager.hasAllPermissions()) return false
    return healthManager.readHeartRates(sinceMinutes)
        .flatMap { it.samples }
        .isNotEmpty()
}

/**
 * 기기 연결: BT 페어링 워치 우선, 없으면 HC 심박 데이터.
 * HC 권한 없어도 Galaxy Fit3 등 BT 등록만 되어 있으면 연결됨.
 */
suspend fun isWatchDeviceConnected(
    context: Context,
    healthManager: HealthConnectManager,
): Boolean {
    if (BluetoothWatchDetector.hasBondedWatch(context)) return true
    return hasRecentWatchHeartRate(healthManager)
}

/** 헬스 앱 연결 = Health Connect 권한 */
suspend fun isHealthAppConnected(healthManager: HealthConnectManager): Boolean =
    runCatching { healthManager.hasAllPermissions() }.getOrDefault(false)
