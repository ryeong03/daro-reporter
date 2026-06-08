package app.hero.heronative.viewmodel

import app.hero.heronative.data.PhoneAlreadyRegisteredException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException

/** ViewModel에서 UI로 전달하는 사용자 메시지 */
internal object UserViewModelMessages {
    const val REGISTER_FAILED = "등록에 실패했습니다. 입력 정보를 확인해주세요"
    const val PHONE_ALREADY_REGISTERED =
        "이미 등록된 전화번호입니다. 다른 번호를 사용하거나 잠시 후 다시 시도해주세요"

    private val json = Json { ignoreUnknownKeys = true }

    fun registerError(cause: Throwable?): String {
        if (cause is PhoneAlreadyRegisteredException) {
            return PHONE_ALREADY_REGISTERED
        }
        if (cause is IllegalArgumentException) {
            return cause.message?.takeIf { it.isNotBlank() } ?: REGISTER_FAILED
        }
        if (cause is HttpException) {
            return when (cause.code()) {
                400 -> parseBadRequest(cause) ?: "입력 정보가 올바르지 않습니다"
                else -> cause.message()?.takeIf { !it.startsWith("HTTP ") } ?: REGISTER_FAILED
            }
        }
        return cause?.message?.takeIf { it.isNotBlank() && !it.startsWith("HTTP ") }
            ?: REGISTER_FAILED
    }

    private fun parseBadRequest(error: HttpException): String? {
        val body = error.response()?.errorBody()?.string() ?: return null
        return runCatching {
            val root = json.parseToJsonElement(body).jsonObject
            val details = root["message"]?.jsonObject?.get("details")?.jsonArray
                ?: root["details"]?.jsonArray
            details?.let(::formatValidationDetails)
        }.getOrNull()
    }

    private fun formatValidationDetails(details: JsonArray): String? {
        val messages = details.mapNotNull { issue ->
            val obj = issue as? JsonObject ?: return@mapNotNull null
            val path = obj["path"]?.jsonArray?.joinToString(".") { it.jsonPrimitive.content }
            when (path) {
                "phone" -> "전화번호는 10자리 이상이어야 합니다"
                "guardians" -> "보호자 전화번호를 확인해주세요"
                else -> null
            }
        }.distinct()
        return messages.takeIf { it.isNotEmpty() }?.joinToString("\n")
    }
}
