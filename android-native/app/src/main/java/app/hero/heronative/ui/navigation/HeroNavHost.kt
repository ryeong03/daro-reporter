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

    when (val current = session) {
        null -> {
            key("onboarding") {
                OnboardingScreen(
                    userViewModel = userViewModel,
                    onComplete = { /* session flow → Home */ },
                )
            }
        }
        else -> {
            key(current.userId) {
                val navController = rememberNavController()
                val navigateToHome: () -> Unit = {
                    navController.navigate("home") {
                        popUpTo("home") { inclusive = false }
                        launchSingleTop = true
                    }
                }
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
                            onNavigateHome = navigateToHome,
                            onOpenMonitoringSettings = { navController.navigate("monitoring_settings") },
                            onOpenGuardians = { navController.navigate("guardians") },
                            onOpenAiCallHistory = { navController.navigate("ai_call_history") },
                        )
                    }
                    composable("monitoring_settings") {
                        MonitoringSettingsScreen(
                            session = current,
                            onBack = { navController.popBackStack() },
                            onNavigateHome = navigateToHome,
                        )
                    }
                    composable("guardians") {
                        GuardianListScreen(
                            session = current,
                            onBack = { navController.popBackStack() },
                            onNavigateHome = navigateToHome,
                        )
                    }
                    composable("ai_call_history") {
                        AiCallHistoryScreen(
                            onBack = { navController.popBackStack() },
                            onNavigateHome = navigateToHome,
                        )
                    }
                }
            }
        }
    }
}
