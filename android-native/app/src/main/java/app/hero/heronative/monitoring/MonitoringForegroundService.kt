package app.hero.heronative.monitoring

import android.app.ForegroundServiceStartNotAllowedException
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import app.hero.heronative.MainActivity
import app.hero.heronative.data.UserStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class MonitoringForegroundService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var dataSync: DataSyncManager

    override fun onCreate() {
        super.onCreate()
        dataSync = DataSyncManager(this)
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!MonitoringServiceRequirements.canStartForeground(this)) {
            Log.w(TAG, "FGS 시작 조건 미충족 — ACTIVITY_RECOGNITION·위치 권한 확인 필요")
            stopSelf()
            return START_NOT_STICKY
        }

        val body = intent?.getStringExtra(EXTRA_BODY)
            ?: MonitoringStateHolder.state.value.notificationBody
        if (!promoteToForeground(body)) {
            stopSelf()
            return START_NOT_STICKY
        }

        scope.launch {
            val session = UserStore(applicationContext).getSessionOnce() ?: return@launch
            dataSync.refreshHealthConnectStatus()
            LocationTrackerHolder.start(scope, app.hero.heronative.location.LocationProvider(applicationContext))
            dataSync.syncOnce(session)
            while (isActive) {
                delay(SYNC_INTERVAL_MS)
                val current = UserStore(applicationContext).getSessionOnce() ?: break
                dataSync.syncOnce(current)
            }
        }

        scope.launch {
            while (isActive) {
                dataSync.pollHeartRate()
                delay(DataSyncManager.HEART_RATE_POLL_INTERVAL_MS)
            }
        }

        return START_STICKY
    }

    private fun promoteToForeground(body: String): Boolean {
        val notification = buildNotification(body)
        val types = ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH or
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, types)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
            true
        } catch (e: SecurityException) {
            Log.e(TAG, "FGS 권한 부족으로 시작 실패", e)
            false
        } catch (e: ForegroundServiceStartNotAllowedException) {
            Log.w(TAG, "백그라운드에서 FGS 시작 불가 — 앱 화면에서 다시 시도", e)
            false
        }
    }

    override fun onDestroy() {
        LocationTrackerHolder.stop()
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createChannel() {
        val mgr = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Hero 모니터링",
            NotificationManager.IMPORTANCE_LOW
        ).apply { description = "농업인 안전 모니터링 서비스" }
        mgr.createNotificationChannel(channel)
    }

    private fun buildNotification(body: String): Notification {
        val pending = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Hero 모니터링 중")
            .setContentText(body)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setContentIntent(pending)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "hero-monitoring"
        private const val NOTIFICATION_ID = 1001
        private const val EXTRA_BODY = "body"
        private const val SYNC_INTERVAL_MS = 10 * 60 * 1000L

        private const val TAG = "MonitoringFgService"

        fun start(context: Context) {
            if (!MonitoringServiceRequirements.canStartForeground(context)) {
                Log.w(TAG, "모니터링 서비스 시작 생략 — 필요 권한 미허용")
                return
            }
            val intent = Intent(context, MonitoringForegroundService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, MonitoringForegroundService::class.java))
        }

        fun updateNotification(appContext: Context, body: String) {
            val mgr = appContext.getSystemService(NotificationManager::class.java) ?: return
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Hero 모니터링",
                NotificationManager.IMPORTANCE_LOW
            )
            mgr.createNotificationChannel(channel)
            val pending = PendingIntent.getActivity(
                appContext,
                0,
                Intent(appContext, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
                .setContentTitle("Hero 모니터링 중")
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setOngoing(true)
                .setContentIntent(pending)
                .build()
            mgr.notify(NOTIFICATION_ID, notification)
        }
    }
}
