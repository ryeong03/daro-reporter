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
    val state: StateFlow<MonitoringUiState> = _state.asStateFlow()

    fun update(transform: (MonitoringUiState) -> MonitoringUiState) {
        _state.value = transform(_state.value)
    }

    /** 등록 초기화 후 UI·연결 상태를 기본값으로 되돌린다 */
    fun reset() {
        _state.value = MonitoringUiState()
    }
}
