package app.hero.heronative.monitoring

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import app.hero.heronative.data.HeartRatePoint
import app.hero.heronative.data.LocationData
import app.hero.heronative.data.UserStore
import kotlinx.coroutines.flow.first
import java.time.Instant

/**
 * WorkManager 주기 작업은 최소 15분 제한이 있어서 RN의 10분과 1:1 매칭이 안 된다.
 * 이 워커는 "복구/보조용" 스켈레톤으로 두고, 실운영은 ForegroundService 루프로 확장한다.
 */
class MonitoringWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val store = UserStore(applicationContext)
        val userId = store.userId.first()
        val deviceId = store.deviceId.first()
        if (userId.isNullOrBlank() || deviceId.isNullOrBlank()) return Result.success()

        // TODO: Health Connect / Location 실제 구현 연결
        val mockHr = listOf(HeartRatePoint(t = Instant.now().toString(), bpm = 0.0))
        val mockSteps = 0L
        val mockLoc = LocationData(lat = 0.0, lng = 0.0, accuracy = 0.0)

        return runCatching {
            MonitoringRepository().sendHealth(
                userId = userId,
                deviceId = deviceId,
                heartRate = mockHr,
                steps10Min = mockSteps,
                location = mockLoc
            )
        }.fold(
            onSuccess = { Result.success() },
            onFailure = { Result.retry() }
        )
    }
}

