package app.hero.heronative.baseline

import android.content.Context
import app.hero.heronative.data.UserStore
import app.hero.heronative.health.HealthConnectManager
import kotlinx.coroutines.flow.Flow
import java.time.LocalDate
import kotlin.math.roundToInt
import kotlin.math.sqrt

/**
 * Figma 측정중-1~3 / 측정완료 / 측정중지 — 3일 캘린더 기준 심박 수집
 */
class BaselineCalibrationManager(
    context: Context,
    private val store: BaselineCalibrationStore = BaselineCalibrationStore(context.applicationContext),
    private val userStore: UserStore = UserStore(context.applicationContext),
) {
    val state: Flow<BaselineCalibrationState> = store.state

    suspend fun ensureLegacyMigration() {
        if (!store.isLegacyMigrated()) {
            store.markLegacyCompleted()
        }
    }

    suspend fun startForNewUser() {
        store.startMeasuring()
    }

    suspend fun dismissCompletionDialog() {
        val current = store.readOnce()
        store.write(current.copy(pendingCompletionDialog = false))
    }

    suspend fun clear() {
        store.clear()
    }

    suspend fun onMeasurementTick(hasHeartRate: Boolean, healthManager: HealthConnectManager) {
        var current = store.readOnce()
        if (!current.isMeasuring) return

        val today = LocalDate.now().toString()
        if (current.todayDate != today) {
            current = current.copy(todayDate = today, todaySampleCount = 0)
        }
        if (hasHeartRate) {
            current = current.copy(todaySampleCount = current.todaySampleCount + 1)
        }

        if (current.todaySampleCount >= MIN_SAMPLES_PER_DAY && today !in current.completedDayDates) {
            current = current.copy(
                completedDayDates = current.completedDayDates + today,
            )
        }

        store.write(current)

        val afterWrite = store.readOnce()
        if (afterWrite.completedDayDates.size >= REQUIRED_DAYS) {
            completeMeasurement(healthManager)
        }
    }

    private suspend fun completeMeasurement(healthManager: HealthConnectManager) {
        val bpms = readCalibrationHeartRates(healthManager)
        val baseline = computeBaselineBpm(bpms)
        val session = userStore.getSessionOnce() ?: return
        userStore.saveUser(
            id = session.userId,
            name = session.userName,
            deviceId = session.deviceId,
            phone = session.phone,
            baselineBpm = baseline,
        )
        store.write(
            BaselineCalibrationState(
                status = BaselineCalibrationStatus.COMPLETED,
                completedDayDates = store.readOnce().completedDayDates,
                pendingCompletionDialog = true,
                lastComputedBaselineBpm = baseline,
            ),
        )
    }

    private suspend fun readCalibrationHeartRates(healthManager: HealthConnectManager): List<Int> {
        if (!healthManager.hasAllPermissions()) return emptyList()
        val sinceMinutes = REQUIRED_DAYS * 24L * 60L
        return healthManager.readHeartRates(sinceMinutes)
            .flatMap { rec -> rec.samples.map { it.beatsPerMinute.toInt() } }
            .filter { it > 0 }
    }

    companion object {
        const val REQUIRED_DAYS = 3
        const val MIN_SAMPLES_PER_DAY = 5
        const val NORMAL_RANGE_LOW = 60
        const val NORMAL_RANGE_HIGH = 100

        fun dayProgressLabel(dayIndex: Int): String = when (dayIndex) {
            1 -> "첫째 날 측정 진행중"
            2 -> "둘째 날 측정 진행중"
            3 -> "셋째 날 측정 진행중"
            else -> "측정 진행중"
        }

        fun computeBaselineBpm(samples: List<Int>): Double {
            if (samples.size < 10) {
                return samples.average().takeIf { !it.isNaN() }?.let {
                    (it * 10).roundToInt() / 10.0
                } ?: 75.0
            }
            val sorted = samples.sorted()
            val trimCount = (sorted.size * 0.1).toInt()
            val trimmed = sorted.drop(trimCount).dropLast(trimCount.coerceAtLeast(0))
            if (trimmed.isEmpty()) return 75.0
            val mean = trimmed.average()
            return (mean * 10).roundToInt() / 10.0
        }

        fun computeSigma(samples: List<Int>, mean: Double): Double {
            if (samples.size < 2) return 10.0
            val variance = samples.map { (it - mean) * (it - mean) }.average()
            return ((sqrt(variance) * 10).roundToInt() / 10.0).coerceAtLeast(1.0)
        }
    }
}
