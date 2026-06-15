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
import app.hero.heronative.baseline.BaselineCalibrationManager
import app.hero.heronative.baseline.BaselineCalibrationState
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
import app.hero.heronative.ui.components.HeroScreenTopBar
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
    val baselineManager = remember { BaselineCalibrationManager(appContext) }
    val baseline by baselineManager.state.collectAsState(initial = BaselineCalibrationState())
    val ui by MonitoringStateHolder.state.collectAsState()
    var pendingOpenHealthConnect by remember { mutableStateOf(false) }
    var showAiCallDialog by remember { mutableStateOf(false) }
    var showDeviceDialog by remember { mutableStateOf(false) }
    var deviceHasHeartRate by remember { mutableStateOf(false) }
    var showHrGuide by remember { mutableStateOf(false) }
    var hrGuidePrompted by remember { mutableStateOf(false) }

    val bluetoothPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* 폴링 루프에서 재확인 */ }

    LaunchedEffect(session.userId) {
        baselineManager.ensureLegacyMigration()
    }

    val completedBaselineBpm = baseline.lastComputedBaselineBpm
    if (baseline.pendingCompletionDialog && completedBaselineBpm != null) {
        BaselineMeasurementCompleteDialog(
            baselineBpm = completedBaselineBpm,
            onConfirm = {
                scope.launch { baselineManager.dismissCompletionDialog() }
            },
        )
    }

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

    val dataSync = remember { DataSyncManager(context) }

    LaunchedEffect(session.userId) {
        while (true) {
            val serverSync = !MonitoringForegroundService.isRunning
            dataSync.tick(session, serverSync = serverSync)
            val snapshot = ConnectionStatusRefresher.refresh(context, healthManager)
            deviceHasHeartRate = snapshot.hasHeartRate
            if (snapshot.bluetoothWatchBonded && !snapshot.hasHeartRate && !hrGuidePrompted) {
                showHrGuide = true
                hrGuidePrompted = true
            }
            if (LocationProvider(appContext).hasFineLocation()) {
                LocationTrackerHolder.ensureStarted(context)
                dataSync.refreshGpsStatus()
            }
            val hrFlowing = deviceHasHeartRate || ui.heartRate > 0
            baselineManager.onMeasurementTick(hrFlowing, healthManager)
            delay(DataSyncManager.HEALTH_SYNC_INTERVAL_MS)
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

    val bluetoothWatchBonded = ui.bluetoothWatchBonded
    val healthAppConnected = ui.watchConnected
    val healthDataFlowing = deviceHasHeartRate || ui.heartRate > 0
    val showAiBanner = ui.aiCallActive
    val showHealthCenterBanner = ui.healthCenterActive
    val showHealthSyncHint = ui.heartRate <= 0 && (healthAppConnected || bluetoothWatchBonded)
    val networkConnected = NetworkUtils.hasInternet(context) || ui.lastSync != null
    // Figma 156:504 — BT 워치 미페어링 시 회색 홈 (HC 심박만으로는 미연결 화면 안 띄움)
    val isBaselineMeasuring = baseline.isMeasuring
    val isBaselineStopped = isBaselineMeasuring && !healthDataFlowing
    val showDisconnectedHome = !bluetoothWatchBonded &&
        ui.detectionState == "normal" &&
        !showAiBanner &&
        !showHealthCenterBanner &&
        !isBaselineMeasuring
    val stateInfo = when {
        isBaselineStopped -> disconnectedStyle()
        showDisconnectedHome -> disconnectedStyle()
        else -> detectionStyle(ui.detectionState)
    }

    val openDeviceFlow: () -> Unit = {
        when {
            !bluetoothWatchBonded -> showDeviceDialog = true
            !healthDataFlowing -> showHrGuide = true
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
            .background(HeroColors.Background),
    ) {
        HeroScreenTopBar(
            showBack = false,
            showHome = false,
            showSettings = false,
        )
        when {
            isBaselineStopped -> BaselineMeasurementStoppedBanner()
            isBaselineMeasuring -> BaselineMeasuringBanner(calibration = baseline)
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
                .padding(bottom = 24.dp),
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
            lastUpdatedLabel = formatLastUpdated(
                lastHeartRateAt = ui.lastHeartRateAt,
                lastHcCheckedAt = ui.lastHcCheckedAt,
                lastServerSync = ui.lastSync,
            ),
        )

        Spacer(Modifier.height(24.dp))

        HomeConnectionCard(
            items = listOf(
                ConnectionItem(
                    icon = HomeConnectionIcons.Device,
                    title = "기기 연결",
                    connected = bluetoothWatchBonded,
                    onClick = openDeviceFlow,
                ),
                ConnectionItem(
                    icon = HomeConnectionIcons.HealthApp,
                    title = "헬스 앱 연결",
                    connected = healthAppConnected,
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
}

private suspend fun startGpsTracking(context: Context) {
    LocationTrackerHolder.ensureStarted(context)
    DataSyncManager(context).refreshGpsStatus()
}
