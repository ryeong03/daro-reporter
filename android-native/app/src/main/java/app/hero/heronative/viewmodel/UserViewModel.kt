package app.hero.heronative.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.hero.heronative.data.Guardian
import app.hero.heronative.data.UserRepository
import app.hero.heronative.data.UserSession
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * 사용자 세션·등록·로그아웃 상태를 관리한다.
 * Android 프레임워크 타입에 의존하지 않으며, 저장소만 주입받는다.
 */
class UserViewModel(
    private val repository: UserRepository,
) : ViewModel() {

    val session: StateFlow<UserSession?> = observeSessionAsState()

    fun register(
        name: String,
        phone: String,
        gender: String?,
        birthDate: String?,
        guardians: List<Guardian>,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        register(
            params = UserRegistrationParams(
                name = name,
                phone = phone,
                gender = gender,
                birthDate = birthDate,
                guardians = guardians,
            ),
            onSuccess = onSuccess,
            onError = onError,
        )
    }

    fun register(
        params: UserRegistrationParams,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        viewModelScope.launch {
            executeRegister(params, onSuccess, onError)
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            executeLogout(onDone)
        }
    }

    private fun observeSessionAsState(): StateFlow<UserSession?> =
        repository
            .observeSession()
            .stateIn(
                scope = viewModelScope,
                started = SharingStarted.WhileSubscribed(SESSION_SUBSCRIBE_TIMEOUT_MS),
                initialValue = null,
            )

    private suspend fun executeRegister(
        params: UserRegistrationParams,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        val result = repository.register(
            name = params.name,
            phone = params.phone,
            gender = params.gender,
            birthDate = params.birthDate,
            guardians = params.guardians,
        )
        notifyRegisterResult(result, onSuccess, onError)
    }

    private fun notifyRegisterResult(
        result: Result<UserSession>,
        onSuccess: () -> Unit,
        onError: (String) -> Unit,
    ) {
        result
            .onSuccess { onSuccess() }
            .onFailure { onError(UserViewModelMessages.registerError(it)) }
    }

    private suspend fun executeLogout(onDone: () -> Unit) {
        repository.clearSession()
        onDone()
    }

    private companion object {
        const val SESSION_SUBSCRIBE_TIMEOUT_MS = 5_000L
    }
}
