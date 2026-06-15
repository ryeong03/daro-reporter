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

    fun observeOnboardingDone(): Flow<Boolean> = store.onboardingDone

    suspend fun getSession(): UserSession? = store.getSessionOnce()

    suspend fun markOnboardingDone() = store.markOnboardingDone()

    suspend fun register(
        name: String,
        phone: String,
        gender: String?,
        birthDate: String?,
        guardians: List<Guardian>,
        saveSession: Boolean = true,
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
            if (saveSession) {
                finalizeRegistration(session)
            }
            Result.success(session)
        } catch (e: HttpException) {
            if (e.code() == 409) {
                try {
                    val session = resumeByPhone(normalizedPhone, saveSession)
                    Result.success(session)
                } catch (inner: Exception) {
                    Result.failure(
                        PhoneAlreadyRegisteredException(normalizedPhone, inner),
                    )
                }
            } else {
                Result.failure(e)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun finalizeRegistration(session: UserSession) {
        persist(session)
        baselineCalibration.startForNewUser()
    }

    suspend fun resumeByPhone(phone: String, saveSession: Boolean = true): UserSession {
        val res = api.getUserByPhone(phone.trim())
        val deviceId = res.user.deviceId ?: "hero-${System.currentTimeMillis()}"
        val session = toSession(res.user, deviceId)
        if (saveSession) {
            finalizeRegistration(session)
        }
        return session
    }

    suspend fun clearSession() {
        store.clear()
        baselineCalibration.clear()
    }

    suspend fun fetchUserDetail(userId: String): Result<UserDetailResponse> = runCatching {
        api.getUser(userId)
    }

    suspend fun updateProfile(
        userId: String,
        name: String,
        phone: String,
    ): Result<UserSession> {
        val normalizedPhone = normalizePhone(phone)
        if (name.trim().isBlank()) {
            return Result.failure(IllegalArgumentException("이름을 입력해주세요"))
        }
        if (!isValidPhone(normalizedPhone)) {
            return Result.failure(IllegalArgumentException("전화번호는 10자리 이상이어야 합니다"))
        }
        return try {
            val current = getSession()
                ?: return Result.failure(IllegalStateException("로그인 정보가 없습니다"))
            val res = api.updateProfile(
                userId,
                UpdateProfileRequest(
                    name = name.trim(),
                    phone = normalizedPhone,
                ),
            )
            val session = toSession(res.user, current.deviceId)
            persist(session)
            Result.success(session)
        } catch (e: Exception) {
            Result.failure(e)
        }
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
