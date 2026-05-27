package app.hero.heronative.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.hero.heronative.data.Guardian
import app.hero.heronative.data.UserRepository
import app.hero.heronative.data.UserSession
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class UserViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = UserRepository(application)

    val session: StateFlow<UserSession?> = repository.observeSession()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    fun register(
        name: String,
        phone: String,
        gender: String?,
        birthDate: String?,
        guardians: List<Guardian>,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            repository.register(name, phone, gender, birthDate, guardians)
                .onSuccess { onSuccess() }
                .onFailure { onError(it.message ?: "등록에 실패했습니다") }
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch {
            repository.clearSession()
            onDone()
        }
    }
}
