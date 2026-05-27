package app.hero.heronative

import android.app.Application
import app.hero.heronative.data.UserStore
import app.hero.heronative.monitoring.MonitoringScheduler
import kotlinx.coroutines.runBlocking

class HeroApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // FGS는 홈 화면에서 권한 허용 후 시작 — 앱 cold start 시 백그라운드 FGS 크래시 방지
        val hasSession = runBlocking { UserStore(applicationContext).getSessionOnce() != null }
        if (hasSession) {
            MonitoringScheduler.schedule(this)
        }
    }
}
