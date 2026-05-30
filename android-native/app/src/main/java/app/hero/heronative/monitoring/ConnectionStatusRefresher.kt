package app.hero.heronative.monitoring

import android.content.Context
import app.hero.heronative.health.BluetoothWatchDetector
import app.hero.heronative.health.HealthConnectManager
import app.hero.heronative.health.hasRecentWatchHeartRate
import app.hero.heronative.health.isHealthAppConnected
import app.hero.heronative.health.isWatchDeviceConnected

/** 홈·온보딩 공통 연결 상태 폴링 */
object ConnectionStatusRefresher {

    suspend fun refresh(
        context: Context,
        healthManager: HealthConnectManager,
    ): ConnectionSnapshot {
        val healthApp = isHealthAppConnected(healthManager)
        val bluetoothWatch = BluetoothWatchDetector.hasBondedWatch(context)
        val device = isWatchDeviceConnected(context, healthManager)
        val hasHeartRate = hasRecentWatchHeartRate(healthManager)
        val network = NetworkUtils.hasInternet(context)
        val lastSync = MonitoringStateHolder.state.value.lastSync

        MonitoringStateHolder.update {
            it.copy(
                watchConnected = healthApp,
                bluetoothWatchBonded = bluetoothWatch,
            )
        }

        return ConnectionSnapshot(
            healthAppConnected = healthApp,
            deviceConnected = device,
            bluetoothWatchBonded = bluetoothWatch,
            hasHeartRate = hasHeartRate,
            networkConnected = network || lastSync != null,
        )
    }

    data class ConnectionSnapshot(
        val healthAppConnected: Boolean,
        val deviceConnected: Boolean,
        val bluetoothWatchBonded: Boolean,
        val hasHeartRate: Boolean,
        val networkConnected: Boolean,
    )
}
