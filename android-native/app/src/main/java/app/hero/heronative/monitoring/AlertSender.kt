package app.hero.heronative.monitoring

import android.content.Context
import app.hero.heronative.data.AlertRequest
import app.hero.heronative.data.ApiClient
import app.hero.heronative.data.LocationData
import app.hero.heronative.data.UserSession
import app.hero.heronative.location.LocationProvider
import app.hero.heronative.location.LocationTracker
import java.time.Instant

object AlertSender {
    suspend fun sendFallAlert(context: Context, session: UserSession): Result<Unit> {
        val location = LocationProvider(context).getCurrentLocation()
            ?: return Result.failure(IllegalStateException("GPS를 가져올 수 없습니다"))
        return runCatching {
            ApiClient.api.sendAlert(
                AlertRequest(
                    deviceId = session.deviceId,
                    userId = session.userId,
                    type = "fall_detected",
                    timestamp = Instant.now().toString(),
                    location = LocationData(lat = location.lat, lng = location.lng, accuracy = location.accuracy)
                )
            )
            LocationTrackerHolder.switchAlertMode()
            MonitoringStateHolder.update {
                it.copy(notificationBody = "🚨 낙상 감지 — 긴급 알림 전송됨")
            }
            MonitoringForegroundService.updateNotification(
                context.applicationContext,
                "🚨 낙상 감지 — 긴급 알림 전송됨"
            )
        }
    }
}
