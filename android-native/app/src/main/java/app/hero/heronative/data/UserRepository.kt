package app.hero.heronative.data

import android.content.Context
import app.hero.heronative.baseline.BaselineCalibrationManager
import kotlinx.coroutines.flow.Flow
import retrofit2.HttpException

class UserRepository(
    context: Context,
    private val api: HeroApi = ApiClient.api,
    private val store: UserStore = UserStore(context.applicationContext),
    private val baselineCalibration: BaselineCalibrationManager =
        BaselineCalibrationManager(context.applicationContext),
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
        val normalizedPhone = normalizePhone(phone)
        if (!isValidPhone(normalizedPhone)) {
            return Result.failure(IllegalArgumentException("전화번호는 10자리 이상이어야 합니다"))
        }
        val normalizedGuardians = guardians
            .map { g ->
                Guardian(
                    name = g.name.trim(),
                    phone = normalizePhone(g.phone),
                    relation = g.relation?.trim()?.takeIf { it.isNotBlank() },
                )
            }
            .filter { it.name.isNotBlank() && isValidPhone(it.phone) }
        val deviceId = "hero-${System.currentTimeMillis()}"
        return try {
            val res = api.register(
                RegisterRequest(
                    name = name.trim(),
                    phone = normalizedPhone,
                    deviceId = deviceId,
                    gender = gender?.takeIf { it == "male" || it == "female" },
                    birthDate = birthDate?.trim()?.takeIf { it.isNotBlank() },
                    guardians = normalizedGuardians,
                )
            )
            val session = toSession(res.user, deviceId)
            persist(session)
            baselineCalibration.startForNewUser()
            Result.success(session)
        } catch (e: HttpException) {
            if (e.code() == 409) {
                try {
                    Result.success(resumeByPhone(normalizedPhone))
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
        baselineCalibration.clear()
    }

    suspend fun fetchUserDetail(userId: String): Result<UserDetailResponse> = runCatching {
        api.getUser(userId)
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
