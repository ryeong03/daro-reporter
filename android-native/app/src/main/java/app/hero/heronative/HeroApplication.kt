package app.hero.heronative

import android.app.Application
import app.hero.heronative.data.UserStore
import app.hero.heronative.monitoring.MonitoringScheduler
import kotlinx.coroutines.runBlocking

class HeroApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        val hasSession = runBlocking { UserStore(applicationContext).getSessionOnce() != null }
        if (hasSession) {
            MonitoringScheduler.schedule(this)
        }
    }
}
