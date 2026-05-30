package app.hero.heronative.health

import java.time.Instant

/** Health Connect에서 읽은 최신 심박 샘플 */
data class HeartRateSample(
    val bpm: Int,
    val measuredAt: Instant,
)
