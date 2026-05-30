package app.hero.heronative.ui.home

import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.PermissionController
import app.hero.heronative.data.UserSession
import app.hero.heronative.health.HealthConnectManager
import app.hero.heronative.location.LocationProvider
import app.hero.heronative.monitoring.DataSyncManager
import app.hero.heronative.monitoring.LocationTrackerHolder
import app.hero.heronative.monitoring.MonitoringForegroundService
import app.hero.heronative.monitoring.MonitoringScheduler
import app.hero.heronative.monitoring.MonitoringServiceRequirements
import app.hero.heronative.monitoring.MonitoringStateHolder
import app.hero.heronative.ui.detectionStyle
import app.hero.heronative.ui.theme.HeroColors
import kotlinx.coroutines.launch

private enum class HomePermissionStep {
    Idle,
    HealthConnect,
    Location,
    Ready,
}

@Composable
fun HomeScreen(
    session: UserSession,
    onOpenSettings: () -> Unit,
) {
    val context = LocalContext.current
    val appContext = context.applicationContext
    val scope = rememberCoroutineScope()
    val healthManager = remember { HealthConnectManager(appContext) }
    val ui by MonitoringStateHolder.state.collectAsState()
    var permissionStep by remember { mutableStateOf(HomePermissionStep.Idle) }

    val hcPermissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract(),
    ) { granted ->
        val connected = granted.containsAll(healthManager.permissions)
        MonitoringStateHolder.update { it.copy(watchConnected = connected) }
        permissionStep = if (connected) HomePermissionStep.Location else HomePermissionStep.Ready
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { _ ->
        scope.launch {
            startGpsTracking(context)
            if (MonitoringServiceRequirements.canStartForeground(context)) {
                MonitoringForegroundService.start(context)
                MonitoringScheduler.schedule(context)
            }
        }
        permissionStep = HomePermissionStep.Ready
    }

    LaunchedEffect(session.userId) {
        permissionStep = HomePermissionStep.Idle
        val hasHc = healthManager.hasAllPermissions()
        MonitoringStateHolder.update { it.copy(watchConnected = hasHc) }
        if (LocationProvider(appContext).hasFineLocation()) {
            LocationTrackerHolder.ensureStarted(context)
            DataSyncManager(context).refreshGpsStatus()
        }
        permissionStep = if (hasHc) HomePermissionStep.Location else HomePermissionStep.HealthConnect
    }

    LaunchedEffect(permissionStep) {
        when (permissionStep) {
            HomePermissionStep.HealthConnect ->
                hcPermissionLauncher.launch(healthManager.permissions)
            HomePermissionStep.Location ->
                permissionLauncher.launch(MonitoringServiceRequirements.monitoringRuntimePermissions())
            else -> Unit
        }
    }

    val stateInfo = detectionStyle(ui.detectionState)
    val requestHcPermissions: () -> Unit = {
        scope.launch {
            if (healthManager.hasAllPermissions()) {
                MonitoringStateHolder.update { it.copy(watchConnected = true) }
            } else {
                hcPermissionLauncher.launch(healthManager.permissions)
            }
        }
    }
    val requestLocationPermissions: () -> Unit = {
        if (MonitoringServiceRequirements.hasLocationAccess(context)) {
            scope.launch { startGpsTracking(context) }
        } else {
            permissionStep = HomePermissionStep.Location
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp),
    ) {
        Spacer(Modifier.height(48.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text = "${session.userName}님",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = HeroColors.TextPrimary,
                )
                Text(
                    text = stateInfo.greeting,
                    fontSize = 15.sp,
                    color = HeroColors.TextSecondary,
                )
            }
            IconButton(
                onClick = onOpenSettings,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(HeroColors.Surface),
            ) {
                Icon(Icons.Default.Settings, contentDescription = "설정")
            }
        }
        Spacer(Modifier.height(24.dp))

        HomeStatusCard(
            statusMessage = stateInfo.statusMessage,
            heartRate = ui.heartRate,
            heartColor = stateInfo.heartColor,
            cardBackground = stateInfo.cardBackground,
            lastUpdatedLabel = ui.lastSync ?: "--:--",
        )

        Spacer(Modifier.height(16.dp))

        HomeConnectionCard(
            items = listOf(
                ConnectionItem(
                    icon = HomeConnectionIcons.Device,
                    title = "기기",
                    connected = ui.watchConnected && ui.heartRate > 0,
                    onReconnect = requestHcPermissions,
                ),
                ConnectionItem(
                    icon = HomeConnectionIcons.HealthApp,
                    title = "헬스 앱",
                    connected = ui.watchConnected,
                    onReconnect = requestHcPermissions,
                ),
                ConnectionItem(
                    icon = HomeConnectionIcons.Lte,
                    title = "LTE",
                    connected = ui.lastSync != null,
                    onReconnect = requestLocationPermissions,
                ),
            ),
        )
        Spacer(Modifier.height(32.dp))
    }
}

private suspend fun startGpsTracking(context: Context) {
    LocationTrackerHolder.ensureStarted(context)
    DataSyncManager(context).refreshGpsStatus()
}
