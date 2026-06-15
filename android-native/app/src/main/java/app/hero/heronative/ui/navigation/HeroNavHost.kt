package app.hero.heronative.ui.navigation

import android.app.Application
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import app.hero.heronative.R
import app.hero.heronative.ui.home.HomeScreen
import app.hero.heronative.ui.onboarding.OnboardingScreen
import app.hero.heronative.ui.settings.AiCallHistoryScreen
import app.hero.heronative.ui.settings.GuardianListScreen
import app.hero.heronative.ui.settings.MonitoringSettingsScreen
import app.hero.heronative.ui.settings.SettingsScreen
import app.hero.heronative.ui.theme.HeroColors
import app.hero.heronative.viewmodel.UserViewModel
import app.hero.heronative.viewmodel.UserViewModelFactory

private const val ROUTE_HOME = "home"
private const val ROUTE_SETTINGS = "settings"

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
            val backStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = backStackEntry?.destination?.route
            val showBottomBar = currentRoute == ROUTE_HOME || currentRoute == ROUTE_SETTINGS

            Scaffold(
                containerColor = HeroColors.Background,
                bottomBar = {
                    if (showBottomBar) {
                        HeroBottomNav(
                            currentRoute = currentRoute,
                            navController = navController,
                        )
                    }
                },
            ) { innerPadding ->
                NavHost(
                    navController = navController,
                    startDestination = ROUTE_HOME,
                    modifier = Modifier.padding(innerPadding),
                ) {
                    composable(ROUTE_HOME) {
                        HomeScreen(
                            session = current,
                            onOpenSettings = { navController.navigateToTab(ROUTE_SETTINGS) },
                        )
                    }
                    composable(ROUTE_SETTINGS) {
                        SettingsScreen(
                            session = current,
                            userViewModel = userViewModel,
                            onBack = { navController.navigateToTab(ROUTE_HOME) },
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
}

private fun NavController.navigateToTab(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

@Composable
private fun HeroBottomNav(
    currentRoute: String?,
    navController: NavController,
) {
    NavigationBar(containerColor = HeroColors.Surface) {
        val itemColors = NavigationBarItemDefaults.colors(
            selectedIconColor = HeroColors.Primary,
            selectedTextColor = HeroColors.Primary,
            unselectedIconColor = HeroColors.TextMuted,
            unselectedTextColor = HeroColors.TextMuted,
            indicatorColor = Color.Transparent,
        )
        NavigationBarItem(
            selected = currentRoute == ROUTE_HOME,
            onClick = { if (currentRoute != ROUTE_HOME) navController.navigateToTab(ROUTE_HOME) },
            icon = {
                Icon(
                    painter = painterResource(R.drawable.ic_nav_home),
                    contentDescription = "홈",
                )
            },
            label = { Text("홈", fontSize = 12.sp, fontWeight = FontWeight.Medium) },
            colors = itemColors,
        )
        NavigationBarItem(
            selected = currentRoute == ROUTE_SETTINGS,
            onClick = { if (currentRoute != ROUTE_SETTINGS) navController.navigateToTab(ROUTE_SETTINGS) },
            icon = {
                Icon(
                    painter = painterResource(R.drawable.ic_nav_user),
                    contentDescription = "내 정보",
                )
            },
            label = { Text("내 정보", fontSize = 12.sp, fontWeight = FontWeight.Medium) },
            colors = itemColors,
        )
    }
}
