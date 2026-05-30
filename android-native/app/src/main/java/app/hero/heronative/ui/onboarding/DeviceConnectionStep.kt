package app.hero.heronative.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.SignalCellularAlt
import androidx.compose.material.icons.outlined.Watch
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.health.HealthConnectManager
import app.hero.heronative.location.LocationProvider
import app.hero.heronative.monitoring.MonitoringServiceRequirements
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.theme.HeroColors
import kotlinx.coroutines.delay

data class DeviceConnectionStatus(
    val device: ConnectionBadgeState = ConnectionBadgeState.Checking,
    val healthApp: ConnectionBadgeState = ConnectionBadgeState.Checking,
    val lte: ConnectionBadgeState = ConnectionBadgeState.Checking,
) {
    val allConnected: Boolean =
        device == ConnectionBadgeState.Connected &&
            healthApp == ConnectionBadgeState.Connected &&
            lte == ConnectionBadgeState.Connected

    val isChecking: Boolean =
        device == ConnectionBadgeState.Checking ||
            healthApp == ConnectionBadgeState.Checking ||
            lte == ConnectionBadgeState.Checking
}

@Composable
fun DeviceConnectionStep(
    healthManager: HealthConnectManager,
    onOpenHealthConnect: () -> Unit,
    onStart: () -> Unit,
    onDeviceDisconnected: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var status by remember { mutableStateOf(DeviceConnectionStatus()) }

    LaunchedEffect(Unit) {
        while (true) {
            val hasHc = healthManager.hasAllPermissions()
            val hasHr = if (hasHc) {
                runCatching {
                    healthManager.readHeartRates(10).flatMap { it.samples }.isNotEmpty()
                }.getOrDefault(false)
            } else {
                false
            }
            val hasLocation = MonitoringServiceRequirements.hasLocationAccess(context)
            val gpsReady = hasLocation && LocationProvider(context).hasFineLocation()

            status = DeviceConnectionStatus(
                device = when {
                    hasHc && hasHr -> ConnectionBadgeState.Connected
                    hasHc -> ConnectionBadgeState.Disconnected
                    else -> ConnectionBadgeState.Disconnected
                },
                healthApp = if (hasHc) ConnectionBadgeState.Connected else ConnectionBadgeState.Disconnected,
                lte = if (gpsReady) ConnectionBadgeState.Connected else ConnectionBadgeState.Disconnected,
            )
            delay(2000)
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 100.dp),
    ) {
        HeroLogoText()
        Spacer(Modifier.height(32.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .shadow(4.dp, RoundedCornerShape(12.dp))
                .clip(RoundedCornerShape(12.dp))
                .background(HeroColors.Surface)
                .padding(horizontal = 24.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "기기 연결을 확인할게요",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
            )
            Text(
                text = "갤럭시 핏 또는 스마트 워치를 연결해주세요.\nHealth Connect 앱이 설치되어 있어야 합니다.",
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = HeroColors.TextBody,
                lineHeight = 26.sp,
            )

            DeviceConnectionRow(
                icon = Icons.Outlined.Watch,
                title = "기기 연결",
                state = status.device,
                onClick = onOpenHealthConnect,
            )
            Divider()
            DeviceConnectionRow(
                icon = Icons.Outlined.MonitorHeart,
                title = "헬스 앱 연결",
                state = status.healthApp,
                onClick = onOpenHealthConnect,
            )
            Divider()
            DeviceConnectionRow(
                icon = Icons.Outlined.SignalCellularAlt,
                title = "LTE 통신",
                state = status.lte,
                onClick = onOpenHealthConnect,
            )
        }

        Spacer(Modifier.height(32.dp))

        HeroPrimaryButton(
            text = "히어로 시작하기",
            onClick = {
                when {
                    status.isChecking -> Unit
                    status.device == ConnectionBadgeState.Disconnected -> onDeviceDisconnected()
                    status.allConnected -> onStart()
                    else -> onOpenHealthConnect()
                }
            },
            enabled = !status.isChecking,
        )
    }
}

@Composable
private fun DeviceConnectionRow(
    icon: ImageVector,
    title: String,
    state: ConnectionBadgeState,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(HeroColors.StatusCardNormal),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, contentDescription = null, tint = HeroColors.Primary, modifier = Modifier.size(24.dp))
        }
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
        )
        ConnectionBadge(state)
    }
}

@Composable
private fun Divider() {
    Box(
        Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(HeroColors.Border),
    )
}
