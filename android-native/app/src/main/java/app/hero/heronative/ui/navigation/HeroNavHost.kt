package app.hero.heronative.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import app.hero.heronative.ui.home.HomeScreen
import app.hero.heronative.ui.onboarding.OnboardingScreen
import app.hero.heronative.ui.settings.SettingsScreen
import app.hero.heronative.viewmodel.UserViewModel

@Composable
fun HeroNavHost() {
    val userViewModel: UserViewModel = viewModel()
    val session by userViewModel.session.collectAsState()
    val navController = rememberNavController()

    when (session) {
        null -> {
            OnboardingScreen(
                userViewModel = userViewModel,
                onComplete = { /* session flow updates → Home */ }
            )
        }
        else -> {
            val current = checkNotNull(session)
            NavHost(navController = navController, startDestination = "home") {
                composable("home") {
                    HomeScreen(
                        session = current,
                        onOpenSettings = { navController.navigate("settings") }
                    )
                }
                composable("settings") {
                    SettingsScreen(
                        session = current,
                        userViewModel = userViewModel,
                        onBack = { navController.popBackStack() },
                        onLoggedOut = {
                            navController.popBackStack("home", inclusive = true)
                        }
                    )
                }
            }
        }
    }
}
