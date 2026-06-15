package app.hero.heronative.monitoring

import app.hero.heronative.data.LocationData
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class MonitoringUiState(
    val heartRate: Int = 0,
    val steps: Long = 0,
    val detectionState: String = "normal",
    val watchConnected: Boolean = false,
    val bluetoothWatchBonded: Boolean = false,
    val gpsActive: Boolean = false,
    /** HC 심박 샘플 측정 시각 (HH:mm:ss) */
    val lastHeartRateAt: String? = null,
    /** HC 심박 샘플 측정 시각 (epoch ms) — 지연 안내용 */
    val lastHeartRateMeasuredEpochMs: Long? = null,
    /** 마지막 HC 조회 시각 — 데이터 없을 때도 표시 */
    val lastHcCheckedAt: String? = null,
    /** 서버 전송 성공 시각 */
    val lastSync: String? = null,
    val aiCallActive: Boolean = false,
    val healthCenterActive: Boolean = false,
    val location: LocationData? = null,
    val notificationBody: String = "어르신의 안전을 지키고 있습니다"
)

object MonitoringStateHolder {
    private val _state = MutableStateFlow(MonitoringUiState())
    private var debugOverride: MonitoringUiState? = null
    val state: StateFlow<MonitoringUiState> = _state.asStateFlow()

    fun update(transform: (MonitoringUiState) -> MonitoringUiState) {
        val next = transform(_state.value)
        _state.value = debugOverride?.let { override ->
            next.copy(
                heartRate = override.heartRate,
                detectionState = override.detectionState,
                watchConnected = override.watchConnected,
                bluetoothWatchBonded = override.bluetoothWatchBonded,
                lastHeartRateAt = override.lastHeartRateAt,
                lastHeartRateMeasuredEpochMs = override.lastHeartRateMeasuredEpochMs,
                notificationBody = override.notificationBody,
            )
        } ?: next
    }

    fun setDebugHeartRate(
        bpm: Int,
        detectionState: String,
        measuredAtLabel: String,
        measuredAtEpochMs: Long,
    ) {
        val next = _state.value.copy(
            heartRate = bpm,
            detectionState = detectionState,
            watchConnected = true,
            bluetoothWatchBonded = true,
            lastHeartRateAt = measuredAtLabel,
            lastHeartRateMeasuredEpochMs = measuredAtEpochMs,
            notificationBody = "디버그 심박: ${bpm} BPM",
        )
        debugOverride = next
        _state.value = next
    }

    fun clearDebugOverride() {
        debugOverride = null
    }

    /** 등록 초기화 후 UI·연결 상태를 기본값으로 되돌린다 */
    fun reset() {
        debugOverride = null
        _state.value = MonitoringUiState()
    }
}
