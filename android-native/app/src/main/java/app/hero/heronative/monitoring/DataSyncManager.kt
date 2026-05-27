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
        val heartRecords = runCatching { healthManager.readHeartRates(10) }.getOrElse { emptyList() }
        val stepRecords = runCatching { healthManager.readSteps(10) }.getOrElse { emptyList() }

        val points = heartRecords.flatMap { rec ->
            rec.samples.map { s ->
                HeartRatePoint(
                    t = (s.time ?: rec.startTime).toString(),
                    bpm = s.beatsPerMinute.toDouble()
                )
            }
        }

        val steps = stepRecords.sumOf { it.count.toLong() }
        val latestBpm = points.lastOrNull()?.bpm?.toInt() ?: 0

        MonitoringStateHolder.update {
            it.copy(
                watchConnected = points.isNotEmpty(),
                heartRate = latestBpm,
                steps = steps
            )
        }

        if (points.isEmpty()) return false

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
                    notificationBody = body
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
        val records = runCatching { healthManager.readHeartRates(10) }.getOrElse { emptyList() }
        val bpm = records.lastOrNull()?.samples?.lastOrNull()?.beatsPerMinute
        if (bpm != null) {
            MonitoringStateHolder.update {
                it.copy(heartRate = bpm.toInt(), watchConnected = true)
            }
        }
    }
}

/** LocationTracker를 서비스/홈에서 공유 */
object LocationTrackerHolder {
    private var tracker: LocationTracker? = null

    fun start(scope: kotlinx.coroutines.CoroutineScope, provider: LocationProvider) {
        if (tracker != null) return
        tracker = LocationTracker(scope, provider) { loc ->
            MonitoringStateHolder.update { it.copy(location = loc, gpsActive = true) }
        }
        tracker?.start(LocationTracker.Mode.NORMAL)
    }

    fun switchAlertMode() = tracker?.switchMode(LocationTracker.Mode.ALERT)
    fun switchNormalMode() = tracker?.switchMode(LocationTracker.Mode.NORMAL)
    fun stop() {
        tracker?.stop()
        tracker = null
    }
}
