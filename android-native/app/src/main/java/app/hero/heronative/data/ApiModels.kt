package app.hero.heronative.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RegisterRequest(
    val name: String,
    val phone: String,
    @SerialName("device_id") val deviceId: String,
    val gender: String? = null,
    @SerialName("birth_date") val birthDate: String? = null,
    val guardians: List<Guardian> = emptyList()
)

@Serializable
data class Guardian(
    val name: String,
    val phone: String,
    val relation: String? = null
)

@Serializable
data class RegisterResponse(val user: UserDto)

@Serializable
data class UpdateProfileRequest(
    val name: String,
    val phone: String,
)

@Serializable
data class UserDto(
    val id: String,
    val name: String,
    val phone: String,
    @SerialName("device_id") val deviceId: String? = null,
    @SerialName("baseline_bpm") val baselineBpm: Double = 75.0
)

@Serializable
data class UserDetailResponse(
    val id: String,
    val name: String,
    val phone: String,
    @SerialName("device_id") val deviceId: String? = null,
    @SerialName("baseline_bpm") val baselineBpm: Double = 75.0,
    val guardians: List<Guardian> = emptyList(),
    @SerialName("latest_location") val latestLocation: LatestLocationDto? = null
)

@Serializable
data class LatestLocationDto(
    val lat: Double,
    val lng: Double,
    val timestamp: String
)

@Serializable
data class LocationData(
    val lat: Double,
    val lng: Double,
    val accuracy: Double? = null
)

@Serializable
data class HeartRatePoint(
    val t: String,
    val bpm: Double
)

@Serializable
data class HealthDataRequest(
    @SerialName("device_id") val deviceId: String,
    @SerialName("user_id") val userId: String,
    val timestamp: String,
    @SerialName("heart_rate") val heartRate: List<HeartRatePoint>,
    @SerialName("steps_10min") val steps10Min: Long,
    val location: LocationData
)

@Serializable
data class HealthDataResponse(val detection: DetectionDto)

@Serializable
data class DetectionDto(
    val state: String,
    val triggered: Boolean
)

@Serializable
data class AlertRequest(
    @SerialName("device_id") val deviceId: String,
    @SerialName("user_id") val userId: String,
    val type: String,
    val timestamp: String,
    val location: LocationData
)

@Serializable
data class AlertResponse(val ok: Boolean = true)
