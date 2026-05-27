package app.hero.heronative.ui.home

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.data.UserSession
import app.hero.heronative.monitoring.MonitoringForegroundService
import app.hero.heronative.monitoring.MonitoringScheduler
import app.hero.heronative.monitoring.MonitoringStateHolder
import app.hero.heronative.ui.detectionStyle
import app.hero.heronative.ui.theme.HeroColors

@Composable
fun HomeScreen(
    session: UserSession,
    onOpenSettings: () -> Unit
) {
    val context = LocalContext.current
    val ui by MonitoringStateHolder.state.collectAsState()

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { _ ->
        MonitoringForegroundService.start(context)
        MonitoringScheduler.schedule(context)
    }

    LaunchedEffect(session.userId) {
        val perms = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            perms.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }
        permissionLauncher.launch(perms.toTypedArray())
    }

    val pulse by rememberInfiniteTransition(label = "pulse").animateFloat(
        initialValue = 1f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(tween(500), RepeatMode.Reverse),
        label = "scale"
    )
    val stateInfo = detectionStyle(ui.detectionState)
    val hr = ui.heartRate
    val barColor = when {
        hr > 120 -> HeroColors.Danger
        hr > 100 -> HeroColors.Warning
        else -> HeroColors.Primary
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp)
    ) {
        Spacer(Modifier.height(48.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("${session.userName}님", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = HeroColors.TextPrimary)
                Text("오늘도 안전한 하루 되세요", fontSize = 15.sp, color = HeroColors.TextSecondary)
            }
            IconButton(
                onClick = onOpenSettings,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(HeroColors.Surface)
            ) {
                Icon(Icons.Default.Settings, contentDescription = "설정")
            }
        }
        Spacer(Modifier.height(24.dp))

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(24.dp))
                .background(HeroColors.Surface)
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("현재 심박수", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = HeroColors.TextSecondary)
            Text(
                text = if (hr > 0) "$hr" else "--",
                fontSize = 72.sp,
                fontWeight = FontWeight.ExtraBold,
                color = HeroColors.Primary,
                modifier = Modifier.scale(pulse)
            )
            Text("BPM", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = HeroColors.TextSecondary)
            Spacer(Modifier.height(16.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(HeroColors.Border)
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(if (hr > 0) (hr / 180f).coerceAtMost(1f) else 0f)
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(barColor)
                )
            }
            Text("정상 범위: 60~100 BPM", fontSize = 12.sp, color = HeroColors.TextMuted, modifier = Modifier.padding(top = 8.dp))
        }

        Spacer(Modifier.height(16.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(16.dp))
                .background(stateInfo.background)
                .padding(18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(Modifier.size(12.dp).clip(CircleShape).background(stateInfo.color))
            Column {
                Text(stateInfo.label, fontSize = 17.sp, fontWeight = FontWeight.Bold, color = stateInfo.color)
                Text(stateInfo.description, fontSize = 13.sp, color = HeroColors.TextSecondary)
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            GridCard("👣", if (ui.steps > 0) ui.steps.toString() else "--", "10분 걸음수", Modifier.weight(1f))
            GridCard("📡", if (ui.gpsActive) "ON" else "OFF", "GPS 추적", Modifier.weight(1f))
        }

        Spacer(Modifier.height(16.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(20.dp))
                .background(HeroColors.Surface)
                .padding(20.dp)
        ) {
            Text("연결 상태", fontSize = 17.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(12.dp))
            ConnectionRow("⌚", "스마트워치", ui.watchConnected)
            DividerLine()
            ConnectionRow("🔄", "마지막 동기화", label = ui.lastSync ?: "-", badge = false)
            DividerLine()
            ConnectionRow("🌐", "서버 통신", true)
        }
        Spacer(Modifier.height(32.dp))
    }
}

@Composable
private fun GridCard(icon: String, value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(HeroColors.Surface)
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(icon, fontSize = 28.sp)
        Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text(label, fontSize = 12.sp, color = HeroColors.TextSecondary)
    }
}

@Composable
private fun ConnectionRow(icon: String, title: String, connected: Boolean) {
    ConnectionRow(icon, title, label = if (connected) "연결됨" else "미연결", badge = true, positive = connected)
}

@Composable
private fun ConnectionRow(icon: String, title: String, label: String, badge: Boolean, positive: Boolean = true) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(icon, fontSize = 20.sp, modifier = Modifier.width(32.dp))
        Text(title, modifier = Modifier.weight(1f), fontSize = 15.sp)
        if (badge) {
            Text(
                label,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (positive) HeroColors.PrimaryLight else HeroColors.DangerBg)
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (positive) HeroColors.Primary else HeroColors.Danger
            )
        } else {
            Text(label, fontSize = 14.sp, color = HeroColors.TextSecondary)
        }
    }
}

@Composable
private fun DividerLine() {
    Spacer(Modifier.height(4.dp))
    Box(Modifier.fillMaxWidth().height(1.dp).background(HeroColors.Border))
    Spacer(Modifier.height(4.dp))
}
