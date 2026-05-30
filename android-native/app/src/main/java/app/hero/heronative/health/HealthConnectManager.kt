package app.hero.heronative.health

import android.content.Context
import android.content.Intent
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant

class HealthConnectManager(context: Context) {
    private val appContext = context.applicationContext

    val isAvailable: Boolean =
        HealthConnectClient.getSdkStatus(appContext) == HealthConnectClient.SDK_AVAILABLE

    private val client: HealthConnectClient? = if (isAvailable) {
        runCatching { HealthConnectClient.getOrCreate(appContext) }.getOrNull()
    } else {
        null
    }

    val permissions: Set<String> = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
    )

    /** 심박·걸음 읽기 권한이 모두 허용됐는지 확인한다 */
    suspend fun hasAllPermissions(): Boolean {
        val c = client ?: return false
        val granted = c.permissionController.getGrantedPermissions()
        return permissions.all { it in granted }
    }

    /** Health Connect 앱 설정 화면으로 이동하는 Intent */
    fun createManageDataIntent(): Intent? =
        if (isAvailable) {
            HealthConnectClient.getHealthConnectManageDataIntent(appContext)
        } else {
            null
        }

    suspend fun readHeartRates(sinceMinutes: Long): List<HeartRateRecord> {
        val c = client ?: return emptyList()
        val now = Instant.now()
        val start = now.minusSeconds(sinceMinutes * 60)
        val req = ReadRecordsRequest(
            recordType = HeartRateRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start, now),
        )
        return runCatching { c.readRecords(req).records }.getOrElse { emptyList() }
    }

    /** HC에 저장된 가장 최근 심박 샘플 (표시·수신 시각용) */
    suspend fun readLatestHeartRate(
        sinceMinutes: Long = DISPLAY_HEART_RATE_WINDOW_MINUTES,
    ): HeartRateSample? {
        if (!hasAllPermissions()) return null
        return readHeartRates(sinceMinutes)
            .flatMap { rec ->
                rec.samples.map { sample ->
                    (sample.time ?: rec.endTime) to sample.beatsPerMinute
                }
            }
            .filter { it.second > 0 }
            .maxByOrNull { it.first }
            ?.let { (time, bpm) ->
                HeartRateSample(bpm = bpm.toInt(), measuredAt = time)
            }
    }

    suspend fun readLatestHeartRateBpm(
        sinceMinutes: Long = DISPLAY_HEART_RATE_WINDOW_MINUTES,
    ): Int? = readLatestHeartRate(sinceMinutes)?.bpm

    companion object {
        /** HC → Hero 심박 수신 여부 판정 (최근 동기화) */
        const val RECENT_HEART_RATE_WINDOW_MINUTES = 60L

        /** 화면 표시용 조회 구간 (Fit3 → 삼성헬스 → HC 지연) */
        const val DISPLAY_HEART_RATE_WINDOW_MINUTES = 24 * 60L
    }

    suspend fun readSteps(sinceMinutes: Long): List<StepsRecord> {
        val c = client ?: return emptyList()
        val now = Instant.now()
        val start = now.minusSeconds(sinceMinutes * 60)
        val req = ReadRecordsRequest(
            recordType = StepsRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start, now),
        )
        return runCatching { c.readRecords(req).records }.getOrElse { emptyList() }
    }
}
