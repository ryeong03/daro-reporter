package app.hero.heronative.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.components.HeroSecondaryButton
import app.hero.heronative.ui.theme.HeroColors

/**
 * 상시 심박 측정은 삼성헬스·워치에서 사용자가 켜야 한다.
 * 앱에서 자동 ON은 OS/API상 불가 → 설정 안내 다이얼로그.
 */
@Composable
fun ContinuousHeartRateGuideDialog(
    onOpenGalaxyWearable: () -> Unit,
    onOpenHealthConnect: () -> Unit,
    onOpenSamsungHealth: () -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(HeroColors.Overlay)
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier
                    .padding(horizontal = 24.dp)
                    .shadow(4.dp, RoundedCornerShape(12.dp))
                    .clip(RoundedCornerShape(12.dp))
                    .background(HeroColors.Surface)
                    .clickable(enabled = false) {}
                    .padding(horizontal = 24.dp, vertical = 24.dp)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
            ) {
                Text(
                    text = "상시 심박 측정 설정",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = HeroColors.TextBody,
                    modifier = Modifier.padding(bottom = 16.dp),
                )
                GuideStep(
                    number = "1",
                    text = "Galaxy Wearable → 내 워치 → 건강 → 심박 → 「자동 측정」 켜기",
                )
                Spacer(Modifier.height(12.dp))
                GuideStep(
                    number = "2",
                    text = "Samsung Health → 설정 → Health Connect (「애플리케이션」) → 삼성헬스 데이터 공유 허용",
                )
                Spacer(Modifier.height(12.dp))
                GuideStep(
                    number = "3",
                    text = "Samsung Health → 심박 → ⋮ → 고급 측정 → 「연속」 선택 (기기별 메뉴명 다를 수 있음)",
                )
                Spacer(Modifier.height(12.dp))
                GuideStep(
                    number = "4",
                    text = "Health Connect → Hero → 심박·걸음 읽기 권한 허용",
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    text = "설정 후 워치를 착용하면 Health Connect로 심박이 전달됩니다. (연속 측정은 배터리 절약을 위해 폰 동기화가 지연될 수 있습니다)",
                    fontSize = 14.sp,
                    color = HeroColors.TextSecondary,
                    lineHeight = 22.sp,
                )
                Spacer(Modifier.height(20.dp))
                HeroPrimaryButton(
                    text = "Galaxy Wearable 열기",
                    onClick = onOpenGalaxyWearable,
                )
                Spacer(Modifier.height(8.dp))
                HeroSecondaryButton(
                    text = "Health Connect 설정 열기",
                    onClick = onOpenHealthConnect,
                )
                Spacer(Modifier.height(8.dp))
                HeroSecondaryButton(
                    text = "Samsung Health 열기",
                    onClick = onOpenSamsungHealth,
                )
                Spacer(Modifier.height(8.dp))
                HeroSecondaryButton(
                    text = "닫기",
                    onClick = onDismiss,
                )
            }
        }
    }
}

@Composable
private fun GuideStep(number: String, text: String) {
    Text(
        text = "$number. $text",
        fontSize = 15.sp,
        fontWeight = FontWeight.Medium,
        color = HeroColors.TextBody,
        lineHeight = 24.sp,
    )
}
