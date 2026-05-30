package app.hero.heronative.monitoring

import android.content.Context
import app.hero.heronative.data.HealthDataRequest
import app.hero.heronative.data.HeartRatePoint
import app.hero.heronative.data.UserSession
import app.hero.heronative.health.HealthConnectManager
import app.hero.heronative.location.LocationProvider
import app.hero.heronative.location.LocationTracker
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.launch

class DataSyncManager(
    context: Context,
    private val appContext: Context = context.applicationContext,
    private val healthManager: HealthConnectManager = HealthConnectManager(context),
    private val locationProvider: LocationProvider = LocationProvider(context),
    private val repository: MonitoringRepository = MonitoringRepository(),
    private val offlineQueue: OfflineQueueStore = OfflineQueueStore(context)
) {
    private val timeFormatter =
        DateTimeFormatter.ofPattern("HH:mm:ss", Locale.KOREA).withZone(ZoneId.systemDefault())

    suspend fun syncOnce(session: UserSession): Boolean {
        val healthConnectReady = healthManager.hasAllPermissions()
        val heartRecords = if (healthConnectReady) {
            runCatching {
                healthManager.readHeartRates(HealthConnectManager.RECENT_HEART_RATE_WINDOW_MINUTES)
            }.getOrElse { emptyList() }
        } else {
            emptyList()
        }
        val stepRecords = if (healthConnectReady) {
            runCatching { healthManager.readSteps(10) }.getOrElse { emptyList() }
        } else {
            emptyList()
        }

        val points = heartRecords.flatMap { rec ->
            rec.samples.map { s ->
                HeartRatePoint(
                    t = (s.time ?: rec.startTime).toString(),
                    bpm = s.beatsPerMinute.toDouble()
                )
            }
        }

        val steps = stepRecords.sumOf { it.count.toLong() }
        val latestSample = if (healthConnectReady) {
            healthManager.readLatestHeartRate()
        } else {
            null
        }
        val latestBpm = latestSample?.bpm ?: points.lastOrNull()?.bpm?.toInt() ?: 0
        val checkedAt = timeFormatter.format(Instant.now())

        MonitoringStateHolder.update {
            it.copy(
                watchConnected = healthConnectReady,
                lastHcCheckedAt = checkedAt,
                heartRate = if (latestBpm > 0) latestBpm else it.heartRate,
                lastHeartRateAt = latestSample?.let { s -> timeFormatter.format(s.measuredAt) }
                    ?: it.lastHeartRateAt,
                steps = if (steps > 0) steps else it.steps,
            )
        }

        refreshGpsStatus()

        if (!healthConnectReady || points.isEmpty()) return false

        val location = locationProvider.getCurrentLocation()
        if (location == null) return false

        val payload = HealthDataRequest(
            deviceId = session.deviceId,
            userId = session.userId,
            timestamp = Instant.now().toString(),
            heartRate = points,
            steps10Min = steps,
            location = location
        )

        return runCatching {
            val response = repository.sendHealth(
                userId = session.userId,
                deviceId = session.deviceId,
                heartRate = points,
                steps10Min = steps,
                location = location
            )
            flushOfflineQueue(session)
            val avgBpm = points.map { it.bpm }.average().toInt()
            val body = if (response.detection.triggered) {
                "⚠️ 이상 감지 — AI 확인 전화 진행 중 (심박: ${avgBpm} BPM)"
            } else {
                "심박: ${avgBpm} BPM · 걸음: ${steps}보"
            }
            MonitoringStateHolder.update {
                it.copy(
                    detectionState = response.detection.state,
                    heartRate = avgBpm,
                    steps = steps,
                    gpsActive = true,
                    location = location,
                    lastSync = timeFormatter.format(Instant.now()),
                    notificationBody = body,
                    aiCallActive = response.detection.triggered,
                    healthCenterActive = response.detection.state == "alert",
                )
            }
            MonitoringForegroundService.updateNotification(appContext, body)
            if (response.detection.triggered) {
                LocationTrackerHolder.switchAlertMode()
            } else if (response.detection.state == "normal") {
                LocationTrackerHolder.switchNormalMode()
            }
            true
        }.getOrElse {
            offlineQueue.enqueue(payload)
            false
        }
    }

    private suspend fun flushOfflineQueue(session: UserSession) {
        val pending = offlineQueue.load()
        if (pending.isEmpty()) return
        val failed = mutableListOf<HealthDataRequest>()
        for (item in pending) {
            val ok = runCatching {
                repository.sendHealth(
                    userId = item.userId,
                    deviceId = item.deviceId,
                    heartRate = item.heartRate,
                    steps10Min = item.steps10Min,
                    location = item.location
                )
            }.isSuccess
            if (!ok) failed.add(item)
        }
        offlineQueue.replace(failed)
    }

    suspend fun pollHeartRate() {
        val checkedAt = timeFormatter.format(Instant.now())
        if (!healthManager.hasAllPermissions()) {
            MonitoringStateHolder.update {
                it.copy(watchConnected = false, lastHcCheckedAt = checkedAt)
            }
            return
        }
        val sample = healthManager.readLatestHeartRate()
        MonitoringStateHolder.update {
            if (sample != null) {
                it.copy(
                    heartRate = sample.bpm,
                    watchConnected = true,
                    lastHeartRateAt = timeFormatter.format(sample.measuredAt),
                    lastHcCheckedAt = checkedAt,
                )
            } else {
                it.copy(watchConnected = true, lastHcCheckedAt = checkedAt)
            }
        }
    }

    companion object {
        /** HC → UI 심박 표시 */
        const val HEART_RATE_POLL_INTERVAL_MS = 1_000L

        /** HC → 서버 감지(5분·2분 타이머). 10분이면 1단계 지속 놓칠 수 있음 */
        const val HEALTH_SYNC_INTERVAL_MS = 2 * 60 * 1000L
    }

    /** Health Connect 권한 상태만 UI에 반영한다 */
    suspend fun refreshHealthConnectStatus() {
        val ready = healthManager.hasAllPermissions()
        MonitoringStateHolder.update { it.copy(watchConnected = ready) }
    }

    /** 위치 권한·좌표를 조회해 GPS UI 상태를 갱신한다 (헬스 동기화와 분리) */
    suspend fun refreshGpsStatus() {
        if (!locationProvider.hasFineLocation()) {
            MonitoringStateHolder.update { it.copy(gpsActive = false) }
            return
        }
        val location = runCatching { locationProvider.getCurrentLocation() }.getOrNull()
        MonitoringStateHolder.update {
            it.copy(
                gpsActive = location != null || LocationTrackerHolder.isRunning(),
                location = location ?: it.location,
            )
        }
    }
}

/** LocationTracker를 서비스/홈에서 공유 */
object LocationTrackerHolder {
    private var tracker: LocationTracker? = null
    private var trackingScope: kotlinx.coroutines.CoroutineScope? = null

    fun isRunning(): Boolean = tracker != null

    fun start(scope: kotlinx.coroutines.CoroutineScope, provider: LocationProvider) {
        if (tracker != null) return
        trackingScope = scope
        tracker = LocationTracker(scope, provider) { loc ->
            MonitoringStateHolder.update { it.copy(location = loc, gpsActive = true) }
        }
        tracker?.start(LocationTracker.Mode.NORMAL)
        scope.launch {
            runCatching { provider.getCurrentLocation() }.getOrNull()?.let { loc ->
                MonitoringStateHolder.update { it.copy(location = loc, gpsActive = true) }
            }
        }
    }

    /** FGS 없이도 홈 화면에서 GPS 추적을 시작한다 */
    fun ensureStarted(context: Context) {
        if (!LocationProvider(context).hasFineLocation()) {
            MonitoringStateHolder.update { it.copy(gpsActive = false) }
            return
        }
        if (tracker != null) return
        val scope = trackingScope ?: kotlinx.coroutines.CoroutineScope(
            kotlinx.coroutines.SupervisorJob() + kotlinx.coroutines.Dispatchers.IO,
        ).also { trackingScope = it }
        start(scope, LocationProvider(context.applicationContext))
    }

    fun switchAlertMode() = tracker?.switchMode(LocationTracker.Mode.ALERT)
    fun switchNormalMode() = tracker?.switchMode(LocationTracker.Mode.NORMAL)
    fun stop() {
        tracker?.stop()
        tracker = null
        trackingScope = null
    }
}
