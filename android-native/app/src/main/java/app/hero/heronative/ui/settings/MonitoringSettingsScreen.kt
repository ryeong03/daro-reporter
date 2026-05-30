package app.hero.heronative.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.BuildConfig
import app.hero.heronative.data.UserSession
import app.hero.heronative.ui.components.HeroScreenTopBar
import app.hero.heronative.ui.theme.HeroColors
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

/** Figma 164:460 — 모니터링 / 앱 정보 설정 */
@Composable
fun MonitoringSettingsScreen(
    session: UserSession,
    onBack: () -> Unit,
    onNavigateHome: () -> Unit,
) {
    val baselineUpdated = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy.MM.dd"))

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(HeroColors.Surface)
            .verticalScroll(rememberScrollState()),
    ) {
        HeroScreenTopBar(
            title = "설정",
            showBack = true,
            onBack = onBack,
            showHome = true,
            onNavigateHome = onNavigateHome,
        )

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
