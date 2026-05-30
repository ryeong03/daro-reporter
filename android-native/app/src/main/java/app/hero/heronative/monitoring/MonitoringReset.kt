package app.hero.heronative.monitoring

import android.content.Context

/**
 * 등록 초기화 시 모니터링·UI 상태를 한 번에 되돌린다.
 * 새 사용자 재등록 전 FGS, WorkManager, GPS, 오프라인 큐를 정리한다.
 */
object MonitoringReset {

    suspend fun resetForLogout(context: Context) {
        val appContext = context.applicationContext
        MonitoringForegroundService.stop(appContext)
        MonitoringScheduler.cancel(appContext)
        LocationTrackerHolder.stop()
        MonitoringStateHolder.reset()
        OfflineQueueStore(appContext).replace(emptyList())
    }
}
