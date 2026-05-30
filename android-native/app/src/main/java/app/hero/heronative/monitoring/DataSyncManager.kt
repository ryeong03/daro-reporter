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
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

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

    /**
     * HC 읽기(10초) + 선택적 서버 sync.
     * @param serverSync false면 UI만 갱신 (FGS가 서버 sync 담당할 때 홈에서 사용)
     */
    suspend fun tick(session: UserSession, serverSync: Boolean = true) {
        tickMutex.withLock {
            refreshFromHealthConnect()
            if (serverSync) {
                syncToServer(session)
            }
        }
    }

    /** @deprecated [tick] 사용 */
    suspend fun syncOnce(session: UserSession): Boolean {
        tick(session, serverSync = true)
        return true
    }

    /** HC에서 최신 심박·걸음을 읽어 UI만 갱신한다 */
    suspend fun refreshFromHealthConnect() {
        val checkedAt = timeFormatter.format(Instant.now())
        if (!healthManager.hasAllPermissions()) {
            MonitoringStateHolder.update {
                it.copy(watchConnected = false, lastHcCheckedAt = checkedAt)
            }
            return
        }

        val sample = healthManager.readLatestHeartRate()
        val stepRecords = runCatching { healthManager.readSteps(10) }.getOrElse { emptyList() }
        val steps = stepRecords.sumOf { it.count.toLong() }

        MonitoringStateHolder.update {
            if (sample != null) {
                it.copy(
                    heartRate = sample.bpm,
                    watchConnected = true,
                    lastHeartRateAt = timeFormatter.format(sample.measuredAt),
                    lastHeartRateMeasuredEpochMs = sample.measuredAt.toEpochMilli(),
                    lastHcCheckedAt = checkedAt,
                    steps = if (steps > 0) steps else it.steps,
                )
            } else {
                it.copy(
                    watchConnected = true,
                    lastHcCheckedAt = checkedAt,
                    steps = if (steps > 0) steps else it.steps,
                )
            }
        }
    }

    /** 서버로 헬스 데이터 전송 + detectionState 갱신 (UI BPM은 덮어쓰지 않음) */
    suspend fun syncToServer(session: UserSession): Boolean {
        val healthConnectReady = healthManager.hasAllPermissions()
        if (!healthConnectReady) return false

        val heartRecords = runCatching {
            healthManager.readHeartRates(HealthConnectManager.RECENT_HEART_RATE_WINDOW_MINUTES)
        }.getOrElse { emptyList() }

        val stepRecords = runCatching { healthManager.readSteps(10) }.getOrElse { emptyList() }

        val points = heartRecords.flatMap { rec ->
            rec.samples.map { s ->
                HeartRatePoint(
                    t = (s.time ?: rec.startTime).toString(),
                    bpm = s.beatsPerMinute.toDouble()
                )
            }
        }

        if (points.isEmpty()) return false

        val steps = stepRecords.sumOf { it.count.toLong() }

        refreshGpsStatus()

        val location = locationProvider.getCurrentLocation() ?: return false

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

    /** @deprecated [refreshFromHealthConnect] 사용 */
    suspend fun pollHeartRate() = refreshFromHealthConnect()

    companion object {
        /** HC 읽기 + 서버 sync 공통 주기 */
        const val HEALTH_SYNC_INTERVAL_MS = 10_000L

        private val tickMutex = Mutex()
    }

    suspend fun refreshHealthConnectStatus() {
        val ready = healthManager.hasAllPermissions()
        MonitoringStateHolder.update { it.copy(watchConnected = ready) }
    }

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
