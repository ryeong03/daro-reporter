package app.hero.heronative.monitoring

import app.hero.heronative.data.ApiClient
import app.hero.heronative.data.HealthDataRequest
import app.hero.heronative.data.HealthDataResponse
import app.hero.heronative.data.HeartRatePoint
import app.hero.heronative.data.HeroApi
import app.hero.heronative.data.LocationData
import java.time.Instant

class MonitoringRepository(
    private val api: HeroApi = ApiClient.api
) {
    suspend fun sendHealth(
        userId: String,
        deviceId: String,
        heartRate: List<HeartRatePoint>,
        steps10Min: Long,
        location: LocationData
    ): HealthDataResponse {
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
