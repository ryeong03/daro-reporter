package app.hero.heronative.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.data.UserSession
import app.hero.heronative.monitoring.AlertSender
import app.hero.heronative.monitoring.MonitoringReset
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.theme.HeroColors
import app.hero.heronative.viewmodel.UserViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    session: UserSession,
    userViewModel: UserViewModel,
    onBack: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showLogoutDialog by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("초기화") },
            text = { Text("등록 정보를 삭제하고 처음부터 다시 등록하시겠습니까?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    scope.launch {
                        MonitoringReset.resetForLogout(context)
                        userViewModel.logout(onDone = {})
                    }
                }) { Text("확인", color = HeroColors.Danger) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("취소") }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("설정") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = HeroColors.Background)
            )
        },
        containerColor = HeroColors.Background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(20.dp)
        ) {
            SettingsCard("등록 정보") {
                SettingsRow("이름", session.userName)
                SettingsDivider()
                SettingsRow("사용자 ID", "${session.userId.take(8)}...")
            }
            Spacer(Modifier.height(16.dp))
            SettingsCard("모니터링") {
                SettingsRow("심박 수집", "10초")
                SettingsDivider()
                SettingsRow("GPS 수집", "5분 (이상 시 30초)")
                SettingsDivider()
                SettingsRow("데이터 전송", "10분")
            }
            Spacer(Modifier.height(16.dp))
            HeroPrimaryButton(
                text = "낙상 테스트 알림",
                onClick = {
                    scope.launch {
                        AlertSender.sendFallAlert(context, session)
                            .onSuccess { message = "낙상 알림을 전송했습니다" }
                            .onFailure { message = it.message ?: "전송 실패" }
                    }
                }
            )
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = { showLogoutDialog = true }, modifier = Modifier.fillMaxWidth()) {
                Text("등록 초기화", color = HeroColors.Danger, fontWeight = FontWeight.SemiBold)
            }
            message?.let {
                Text(it, color = HeroColors.TextSecondary, modifier = Modifier.padding(top = 8.dp))
            }
        }
    }
}

@Composable
private fun SettingsCard(title: String, content: @Composable () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(HeroColors.Surface)
            .padding(20.dp)
    ) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
        Spacer(Modifier.height(12.dp))
        content()
    }
}

@Composable
private fun SettingsRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Text(label, modifier = Modifier.weight(1f), color = HeroColors.TextSecondary)
        Text(value, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun SettingsDivider() {
    Spacer(Modifier.height(4.dp))
    Box(Modifier.fillMaxWidth().height(1.dp).background(HeroColors.Border))
    Spacer(Modifier.height(4.dp))
}
