package app.hero.heronative.monitoring

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import app.hero.heronative.data.UserStore

class MonitoringWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val session = UserStore(applicationContext).getSessionOnce()
            ?: return Result.success()
        return runCatching {
            DataSyncManager(applicationContext).syncOnce(session)
        }.fold(
            onSuccess = { Result.success() },
            onFailure = { Result.retry() }
        )
    }
}
