package app.hero.heronative.location

import app.hero.heronative.data.LocationData

/** 번호별 고정 위치 또는 실제 GPS만 사용 (가짜 fallback 없음) */
object HeroLocationDefaults {
    const val ACCURACY_METERS = 10f

    /** 서울 서대문구 이화여대길 52 — 이화 스타트업 오픈 스페이스 */
    private const val EWHA_LAT = 37.562086
    private const val EWHA_LNG = 126.946989

    private val FIXED_BY_PHONE = mapOf(
        "01025819543" to LocationData(EWHA_LAT, EWHA_LNG, ACCURACY_METERS),
    )

    fun resolve(phone: String?, gps: LocationData?): LocationData? {
        normalizePhone(phone)?.let { FIXED_BY_PHONE[it] }?.let { return it }
        return gps
    }

    private fun normalizePhone(phone: String?): String? {
        if (phone.isNullOrBlank()) return null
        val digits = phone.filter { it.isDigit() }
        return when {
            digits.startsWith("82") && digits.length >= 11 -> "0${digits.drop(2)}"
            else -> digits
        }
    }
}
