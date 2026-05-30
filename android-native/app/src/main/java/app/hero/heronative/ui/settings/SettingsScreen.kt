package app.hero.heronative.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.data.UserSession
import app.hero.heronative.data.formatPhoneDisplay
import app.hero.heronative.monitoring.MonitoringReset
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.components.HeroScreenTopBar
import app.hero.heronative.ui.theme.HeroColors
import app.hero.heronative.viewmodel.UserViewModel
import kotlinx.coroutines.launch

/** Figma 165:505 — 내 정보 / 보호자 / AI 콜 이력 허브 */
@Composable
fun SettingsScreen(
    session: UserSession,
    userViewModel: UserViewModel,
    onBack: () -> Unit,
    onNavigateHome: () -> Unit,
    onOpenMonitoringSettings: () -> Unit,
    onOpenGuardians: () -> Unit,
    onOpenAiCallHistory: () -> Unit,
    onEditProfile: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("초기화") },
            text = { Text("등록 정보를 삭제하고 처음부터 다시 등록하시겠습니까?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    scope.launch {
                        MonitoringReset.resetForLogout(context.applicationContext)
                        userViewModel.logout(onDone = {})
                    }
                }) { Text("확인", color = HeroColors.Danger) }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("취소") }
            },
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Background)
            .verticalScroll(rememberScrollState()),
    ) {
        HeroScreenTopBar(
            showBack = true,
            onBack = onBack,
            showHome = true,
            onNavigateHome = onNavigateHome,
            showSettings = true,
            onOpenSettings = onOpenMonitoringSettings,
        )

        ProfileCard(modifier = Modifier.padding(horizontal = 24.dp)) {
            Text(
                text = "내 정보",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                modifier = Modifier.padding(bottom = 12.dp),
            )
            ProfileInfoRow("이름", session.userName)
            Box(Modifier.fillMaxWidth().height(1.dp).background(HeroColors.Border))
            ProfileInfoRow("전화번호", formatPhoneDisplay(session.phone))
            Spacer(Modifier.height(24.dp))
            HeroPrimaryButton(text = "내 정보 수정하기", onClick = onEditProfile)
        }

        Spacer(Modifier.height(24.dp))
        SettingsSectionDivider()

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(HeroColors.Surface)
                .padding(horizontal = 24.dp, vertical = 12.dp),
        ) {
            ProfileNavRow(title = "내 보호자 목록", onClick = onOpenGuardians)
            ProfileNavRow(title = "AI 콜 이력", onClick = onOpenAiCallHistory, showDivider = true)
        }

        Spacer(Modifier.height(32.dp))
        TextButton(
            onClick = { showLogoutDialog = true },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp),
        ) {
            Text("등록 초기화", color = HeroColors.Danger, fontWeight = FontWeight.SemiBold)
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun ProfileInfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            modifier = Modifier.weight(1f),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
        )
        Text(
            text = value,
            fontSize = if (label == "전화번호") 14.sp else 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
        )
    }
}
