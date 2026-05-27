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
    private val client: HealthConnectClient = HealthConnectClient.getOrCreate(appContext)

    val permissions: Set<String> = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
    )

    /** 심박·걸음 읽기 권한이 모두 허용됐는지 확인한다 */
    suspend fun hasAllPermissions(): Boolean {
        val granted = client.permissionController.getGrantedPermissions()
        return permissions.all { it in granted }
    }

    /** Health Connect 앱 설정 화면으로 이동하는 Intent */
    fun createManageDataIntent(): Intent =
        HealthConnectClient.getHealthConnectManageDataIntent(appContext)

    suspend fun readHeartRates(sinceMinutes: Long): List<HeartRateRecord> {
        val now = Instant.now()
        val start = now.minusSeconds(sinceMinutes * 60)
        val req = ReadRecordsRequest(
            recordType = HeartRateRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start, now)
        )
        return client.readRecords(req).records
    }

    suspend fun readSteps(sinceMinutes: Long): List<StepsRecord> {
        val now = Instant.now()
        val start = now.minusSeconds(sinceMinutes * 60)
        val req = ReadRecordsRequest(
            recordType = StepsRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start, now)
        )
        return client.readRecords(req).records
    }
}

