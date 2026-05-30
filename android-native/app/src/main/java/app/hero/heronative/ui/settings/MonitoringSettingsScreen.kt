package app.hero.heronative.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.BuildConfig
import app.hero.heronative.data.UserSession
import app.hero.heronative.ui.theme.HeroColors
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

/** Figma 164:460 — 모니터링 / 앱 정보 설정 */
@Composable
fun MonitoringSettingsScreen(
    session: UserSession,
    onBack: () -> Unit,
) {
    val baselineUpdated = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd"))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Surface)
            .verticalScroll(rememberScrollState()),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(top = 65.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack, modifier = Modifier.size(24.dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로")
            }
            Text(
                text = "설정",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                modifier = Modifier.padding(start = 12.dp),
            )
        }

        SettingsSectionDivider()

        SettingsSection(title = "모니터링") {
            SettingsValueRow(
                label = "기준 심박수",
                value = "${session.baselineBpm.roundToInt()} bpm",
            )
            SettingsValueRow(
                label = "기준 심박수 갱신",
                value = baselineUpdated,
            )
            SettingsValueRow(
                label = "데이터 전송 주기",
                value = "10분",
                showDivider = false,
            )
        }

        SettingsSectionDivider()

        SettingsSection(title = "앱 정보") {
            SettingsValueRow(
                label = "버전",
                value = BuildConfig.VERSION_NAME,
                badgeBackground = HeroColors.Surface,
                showDivider = false,
            )
        }
    }
}
