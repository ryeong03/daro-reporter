package app.hero.heronative.viewmodel

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import app.hero.heronative.data.UserRepository

/**
 * Android Application에서 [UserRepository]를 생성해 [UserViewModel]에 주입한다.
 * ViewModel 패키지 밖의 Android 의존성은 이 Factory에만 둔다.
 */
class UserViewModelFactory(
    private val application: Application,
) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(UserViewModel::class.java)) {
            return UserViewModel(UserRepository(application)) as T
        }
        throw IllegalArgumentException("지원하지 않는 ViewModel: ${modelClass.name}")
    }
}
