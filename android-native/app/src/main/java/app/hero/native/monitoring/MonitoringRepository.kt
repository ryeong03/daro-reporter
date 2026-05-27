package app.hero.native.monitoring

import app.hero.native.data.ApiClient
import app.hero.native.data.HealthDataRequest
import app.hero.native.data.HeartRatePoint
import app.hero.native.data.LocationData
import java.time.Instant

class MonitoringRepository(
    private val api: app.hero.native.data.HeroApi = ApiClient.api
) {
    suspend fun sendHealth(
        userId: String,
        deviceId: String,
        heartRate: List<HeartRatePoint>,
        steps10Min: Long,
        location: LocationData
    ): app.hero.native.data.HealthDataResponse {
        val payload = HealthDataRequest(
            userId = userId,
            deviceId = deviceId,
            timestamp = Instant.now().toString(),
            heartRate = heartRate,
            steps10Min = steps10Min,
            location = location
        )
        return api.sendHealth(payload)
    }
}

