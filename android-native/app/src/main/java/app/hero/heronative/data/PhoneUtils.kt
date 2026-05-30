package app.hero.heronative.data

/** 숫자만 남긴 전화번호 (하이픈·공백 제거) */
fun normalizePhone(raw: String): String = raw.filter { it.isDigit() }

fun isValidPhone(raw: String): Boolean = normalizePhone(raw).length >= 10

/** 010-1234-5678 형식으로 표시 */
fun formatPhoneDisplay(raw: String): String {
    val d = normalizePhone(raw)
    return when (d.length) {
        11 -> "${d.substring(0, 3)}-${d.substring(3, 7)}-${d.substring(7)}"
        10 -> "${d.substring(0, 3)}-${d.substring(3, 6)}-${d.substring(6)}"
        else -> raw
    }
}
