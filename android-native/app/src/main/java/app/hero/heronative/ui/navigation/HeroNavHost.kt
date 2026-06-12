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
import app.hero.heronative.ui.settings.AiCallHistoryScreen
import app.hero.heronative.ui.settings.GuardianListScreen
import app.hero.heronative.ui.settings.MonitoringSettingsScreen
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
    val onboardingDone by userViewModel.onboardingDone.collectAsState()

    // 세션 없음 → 처음부터 온보딩
    // 세션 있음 + 기기연결 미완 → step5 재개
    // 세션 있음 + 온보딩 완료 → Home
    if (session == null || !onboardingDone) {
        key("onboarding") {
            OnboardingScreen(
                userViewModel = userViewModel,
                resumeFromDeviceStep = session != null && !onboardingDone,
                onComplete = { /* onboardingDone → Home */ },
            )
        }
    } else {
        val current = session!!
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
                        onOpenMonitoringSettings = { navController.navigate("monitoring_settings") },
                        onOpenGuardians = { navController.navigate("guardians") },
                        onOpenAiCallHistory = { navController.navigate("ai_call_history") },
                    )
                }
                composable("monitoring_settings") {
                    MonitoringSettingsScreen(
                        session = current,
                        onBack = { navController.popBackStack() },
                    )
                }
                composable("guardians") {
                    GuardianListScreen(
                        session = current,
                        onBack = { navController.popBackStack() },
                    )
                }
                composable("ai_call_history") {
                    AiCallHistoryScreen(
                        onBack = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}

