package app.hero.heronative.location

import app.hero.heronative.data.LocationData

/** 실제 GPS만 사용 (시연 위치 고정은 서버 env DEMO_USER_* 로 처리) */
object HeroLocationDefaults {
    fun resolve(@Suppress("UNUSED_PARAMETER") phone: String?, gps: LocationData?): LocationData? {
        return gps
    }
}
