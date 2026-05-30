package app.hero.heronative.data

data class UserSession(
    val userId: String,
    val userName: String,
    val deviceId: String,
    val phone: String,
    val baselineBpm: Double
)
