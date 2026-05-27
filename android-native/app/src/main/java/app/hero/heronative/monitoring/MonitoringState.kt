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
    val gpsActive: Boolean = false,
    val lastSync: String? = null,
    val location: LocationData? = null,
    val notificationBody: String = "어르신의 안전을 지키고 있습니다"
)

object MonitoringStateHolder {
    private val _state = MutableStateFlow(MonitoringUiState())
    val state: StateFlow<MonitoringUiState> = _state.asStateFlow()

    fun update(transform: (MonitoringUiState) -> MonitoringUiState) {
        _state.value = transform(_state.value)
    }
}
