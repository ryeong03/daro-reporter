package app.hero.heronative.ui.home

import android.content.Context
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.health.connect.client.PermissionController
import app.hero.heronative.data.UserSession
import app.hero.heronative.health.BluetoothWatchDetector
import app.hero.heronative.health.HealthConnectManager
import app.hero.heronative.health.HealthConnectNavigator
import app.hero.heronative.health.SamsungHealthNavigator
import app.hero.heronative.location.LocationProvider
import app.hero.heronative.monitoring.ConnectionStatusRefresher
import app.hero.heronative.monitoring.DataSyncManager
import app.hero.heronative.monitoring.LocationTrackerHolder
import app.hero.heronative.monitoring.MonitoringForegroundService
import app.hero.heronative.monitoring.MonitoringScheduler
import app.hero.heronative.monitoring.MonitoringServiceRequirements
import app.hero.heronative.monitoring.MonitoringStateHolder
import app.hero.heronative.monitoring.NetworkUtils
import app.hero.heronative.ui.detectionStyle
import app.hero.heronative.ui.disconnectedStyle
import app.hero.heronative.ui.theme.HeroColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(
    session: UserSession,
    onOpenSettings: () -> Unit,
) {
    val context = LocalContext.current
    val appContext = context.applicationContext
    val scope = rememberCoroutineScope()
    val snack = remember { SnackbarHostState() }
    val healthManager = remember { HealthConnectManager(appContext) }
    val ui by MonitoringStateHolder.state.collectAsState()
    var pendingOpenHealthConnect by remember { mutableStateOf(false) }
    var showAiCallDialog by remember { mutableStateOf(false) }
    var showDeviceDialog by remember { mutableStateOf(false) }
    var deviceHasHeartRate by remember { mutableStateOf(false) }
    var watchDeviceConnected by remember { mutableStateOf(false) }
    var showHrGuide by remember { mutableStateOf(false) }
    var hrGuidePrompted by remember { mutableStateOf(false) }

    val bluetoothPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* 폴링 루프에서 재확인 */ }

    LaunchedEffect(session.userId) {
        BluetoothWatchDetector.requiredBluetoothPermission()?.let { permission ->
            if (!BluetoothWatchDetector.hasBluetoothPermission(context)) {
                bluetoothPermissionLauncher.launch(permission)
            }
        }
    }

    LaunchedEffect(ui.aiCallActive) {
        if (ui.aiCallActive) showAiCallDialog = true
    }

    if (showAiCallDialog && ui.aiCallActive) {
        AiCallDialog(
            onConfirm = { showAiCallDialog = false },
            onDismiss = { showAiCallDialog = false },
        )
    }

    if (showDeviceDialog) {
        DeviceNotConnectedDialog(onConfirm = { showDeviceDialog = false })
    }

    val hcPermissionLauncher = rememberLauncherForActivityResult(
        contract = PermissionController.createRequestPermissionResultContract(),
    ) { granted ->
        val connected = granted.containsAll(healthManager.permissions)
        MonitoringStateHolder.update { it.copy(watchConnected = connected) }
        if (connected && pendingOpenHealthConnect) {
            pendingOpenHealthConnect = false
            HealthConnectNavigator.openManageData(context, healthManager)
        }
    }

    val openHealthConnect: () -> Unit = {
        pendingOpenHealthConnect = true
        scope.launch {
            HealthConnectNavigator.openSettingsOrRequestPermissions(
                context = context,
                healthManager = healthManager,
                permissionLauncher = hcPermissionLauncher,
                onUnavailable = {
                    pendingOpenHealthConnect = false
                    scope.launch { snack.showSnackbar("Health Connect 앱을 설치해주세요") }
                },
            )
        }
    }

    if (showHrGuide) {
        ContinuousHeartRateGuideDialog(
            onOpenGalaxyWearable = {
                if (!SamsungHealthNavigator.openGalaxyWearable(context)) {
                    SamsungHealthNavigator.openSamsungHealth(context)
                }
            },
            onOpenHealthConnect = openHealthConnect,
            onOpenSamsungHealth = { SamsungHealthNavigator.openSamsungHealth(context) },
            onDismiss = { showHrGuide = false },
        )
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
            DataSyncManager(context).syncOnce(session)
        }
    }

    LaunchedEffect(session.userId) {
        while (true) {
            val snapshot = ConnectionStatusRefresher.refresh(context, healthManager)
            deviceHasHeartRate = snapshot.hasHeartRate
            watchDeviceConnected = snapshot.deviceConnected
            if (snapshot.bluetoothWatchBonded && !snapshot.hasHeartRate && !hrGuidePrompted) {
                showHrGuide = true
                hrGuidePrompted = true
            }
            // BT 연결만으로는 BPM 없음 — HC 권한 있으면 항상 읽기 시도
            if (snapshot.healthAppConnected) {
                DataSyncManager(context).pollHeartRate()
            }
            if (LocationProvider(appContext).hasFineLocation()) {
                LocationTrackerHolder.ensureStarted(context)
                DataSyncManager(context).refreshGpsStatus()
            }
            delay(2_000)
        }
    }

    val openLocationFlow: () -> Unit = {
        if (MonitoringServiceRequirements.hasLocationAccess(context)) {
            scope.launch {
                startGpsTracking(context)
                DataSyncManager(context).syncOnce(session)
            }
        } else {
            permissionLauncher.launch(MonitoringServiceRequirements.monitoringRuntimePermissions())
        }
    }

    val healthAppConnected = ui.watchConnected
    val deviceConnected = watchDeviceConnected
    val healthDataFlowing = deviceHasHeartRate || ui.heartRate > 0
    val showHealthSyncHint = ui.heartRate <= 0 && (healthAppConnected || deviceConnected)
    val networkConnected = NetworkUtils.hasInternet(context) || ui.lastSync != null
    val isDisconnected = !deviceConnected && ui.heartRate <= 0 && !deviceHasHeartRate
    val stateInfo = if (isDisconnected && ui.detectionState == "normal") {
        disconnectedStyle()
    } else {
        detectionStyle(ui.detectionState)
    }
    val showAiBanner = ui.aiCallActive
    val showHealthCenterBanner = ui.healthCenterActive

    val openDeviceFlow: () -> Unit = {
        when {
            !deviceConnected -> showDeviceDialog = true
            !deviceHasHeartRate -> showHrGuide = true
            else -> {
                if (!SamsungHealthNavigator.openDeviceManager(context)) {
                    scope.launch { snack.showSnackbar("Galaxy Wearable 또는 Samsung Health를 설치해주세요") }
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp)
            .padding(top = 65.dp, bottom = 24.dp),
    ) {
        if (showHealthCenterBanner) {
            HealthCenterBanner()
            Spacer(Modifier.height(24.dp))
        } else if (showAiBanner) {
            AiCallBanner()
            Spacer(Modifier.height(24.dp))
        }

        Column(
            modifier = Modifier
                .clickable(onClick = onOpenSettings)
                .padding(bottom = 24.dp),
        ) {
            Text(
                text = "${session.userName} 님",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextPrimary,
            )
            Text(
                text = stateInfo.greeting,
                fontSize = 14.sp,
                color = HeroColors.TextPrimary,
            )
        }

        HomeStatusCard(
            statusMessage = stateInfo.statusMessage,
            heartRate = ui.heartRate,
            heartColor = stateInfo.heartColor,
            cardBackground = stateInfo.cardBackground,
            lastUpdatedLabel = formatLastUpdated(ui.lastSync),
        )

        Spacer(Modifier.height(24.dp))

        HomeConnectionCard(
            items = listOf(
                ConnectionItem(
                    icon = HomeConnectionIcons.Device,
                    title = "기기 연결",
                    connected = deviceConnected,
                    onClick = openDeviceFlow,
                ),
                ConnectionItem(
                    icon = HomeConnectionIcons.HealthApp,
                    title = "헬스 앱 연결",
                    connected = healthAppConnected && healthDataFlowing,
                    onClick = openHealthConnect,
                ),
                ConnectionItem(
                    icon = HomeConnectionIcons.Lte,
                    title = "LTE 통신",
                    connected = networkConnected,
                    onClick = openLocationFlow,
                ),
            ),
        )

        if (showHealthSyncHint) {
            Spacer(Modifier.height(16.dp))
            HealthConnectSyncHintBanner(
                permissionsGranted = healthAppConnected,
                onOpenHealthConnect = openHealthConnect,
                onOpenSamsungHealth = { SamsungHealthNavigator.openSamsungHealth(context) },
                onOpenGuide = { showHrGuide = true },
            )
        }
        SnackbarHost(hostState = snack)
    }
}

private suspend fun startGpsTracking(context: Context) {
    LocationTrackerHolder.ensureStarted(context)
    DataSyncManager(context).refreshGpsStatus()
}
