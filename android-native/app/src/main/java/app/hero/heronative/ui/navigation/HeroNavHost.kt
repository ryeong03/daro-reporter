package app.hero.heronative.ui.navigation

import android.app.Application
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import app.hero.heronative.ui.home.HomeScreen
import app.hero.heronative.ui.onboarding.OnboardingScreen
import app.hero.heronative.ui.settings.SettingsScreen
import app.hero.heronative.viewmodel.UserViewModel
import app.hero.heronative.viewmodel.UserViewModelFactory

@Composable
fun HeroNavHost() {
    val application = LocalContext.current.applicationContext as Application
    val userViewModel: UserViewModel = viewModel(
        factory = UserViewModelFactory(application),
    )
    val session by userViewModel.session.collectAsState()

    when (val current = session) {
        null -> {
            // 로그아웃마다 온보딩 폼·워치 연결 단계를 새로 시작
            key("onboarding") {
                OnboardingScreen(
                    userViewModel = userViewModel,
                    onComplete = { /* session flow → Home */ },
                )
            }
        }
        else -> {
            // 사용자마다 NavController·홈 권한 플로우를 분리 (화이트 화면 방지)
            key(current.userId) {
                val navController = rememberNavController()
                NavHost(navController = navController, startDestination = "home") {
                    composable("home") {
                        HomeScreen(
                            session = current,
                            onOpenSettings = { navController.navigate("settings") },
                        )
                    }
                    composable("settings") {
                        SettingsScreen(
                            session = current,
                            userViewModel = userViewModel,
                            onBack = { navController.popBackStack() },
                        )
                    }
                }
            }
        }
    }
}
