package app.hero.heronative.location

import app.hero.heronative.data.LocationData
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class LocationTracker(
    private val scope: CoroutineScope,
    private val locationProvider: LocationProvider,
    private val onUpdate: (LocationData) -> Unit
) {
    private var job: Job? = null
    private var mode: Mode = Mode.NORMAL

    enum class Mode { NORMAL, ALERT }

    fun start(mode: Mode = Mode.NORMAL) {
        this.mode = mode
        job?.cancel()
        job = scope.launch {
            tick()
            while (isActive) {
                val intervalMs = if (mode == Mode.ALERT) 30_000L else 5 * 60_000L
                delay(intervalMs)
                tick()
            }
        }
    }

    fun switchMode(mode: Mode) {
        if (this.mode == mode) return
        this.mode = mode
        start(mode)
    }

    fun stop() {
        job?.cancel()
        job = null
    }

    private suspend fun tick() {
        val loc = locationProvider.getCurrentLocation() ?: return
        onUpdate(loc)
    }
}
