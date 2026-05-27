package app.hero.heronative.health

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.HeartRateRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant

class HealthConnectManager(context: Context) {
    private val client: HealthConnectClient = HealthConnectClient.getOrCreate(context)

    val permissions: Set<String> = setOf(
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(StepsRecord::class),
    )

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

