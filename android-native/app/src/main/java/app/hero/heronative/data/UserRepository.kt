package app.hero.heronative.data

import android.content.Context
import kotlinx.coroutines.flow.Flow
import retrofit2.HttpException

class UserRepository(
    context: Context,
    private val api: HeroApi = ApiClient.api,
    private val store: UserStore = UserStore(context.applicationContext)
) {
    fun observeSession(): Flow<UserSession?> = store.session

    suspend fun getSession(): UserSession? = store.getSessionOnce()

    suspend fun register(
        name: String,
        phone: String,
        gender: String?,
        birthDate: String?,
        guardians: List<Guardian>
    ): Result<UserSession> {
        val trimmedPhone = phone.trim()
        val deviceId = "hero-${System.currentTimeMillis()}"
        return try {
            val res = api.register(
                RegisterRequest(
                    name = name.trim(),
                    phone = trimmedPhone,
                    deviceId = deviceId,
                    gender = gender,
                    birthDate = birthDate?.takeIf { it.isNotBlank() },
                    guardians = guardians.filter { it.name.isNotBlank() && it.phone.isNotBlank() }
                )
            )
            val session = toSession(res.user, deviceId)
            persist(session)
            Result.success(session)
        } catch (e: HttpException) {
            if (e.code() == 409) {
                try {
                    Result.success(resumeByPhone(trimmedPhone))
                } catch (inner: Exception) {
                    Result.failure(inner)
                }
            } else {
                Result.failure(e)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resumeByPhone(phone: String): UserSession {
        val res = api.getUserByPhone(phone.trim())
        val deviceId = res.user.deviceId ?: "hero-${System.currentTimeMillis()}"
        val session = toSession(res.user, deviceId)
        persist(session)
        return session
    }

    suspend fun clearSession() {
        store.clear()
    }

    private suspend fun persist(session: UserSession) {
        store.saveUser(
            id = session.userId,
            name = session.userName,
            deviceId = session.deviceId,
            phone = session.phone,
            baselineBpm = session.baselineBpm
        )
    }

    private fun toSession(user: UserDto, fallbackDeviceId: String): UserSession =
        UserSession(
            userId = user.id,
            userName = user.name,
            deviceId = user.deviceId ?: fallbackDeviceId,
            phone = user.phone,
            baselineBpm = user.baselineBpm
        )
}
