package app.hero.heronative.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.hero.heronative.baseline.BaselineCalibrationManager
import app.hero.heronative.baseline.BaselineCalibrationState
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.theme.HeroColors
import kotlin.math.roundToInt

/** Figma 160:637 — 측정중 배너 (1~3일차) */
@Composable
fun BaselineMeasuringBanner(
    calibration: BaselineCalibrationState,
    modifier: Modifier = Modifier,
) {
    val completed = calibration.completedDayDates.size
    val activeDay = calibration.activeDayIndex

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Black)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = "기준 심박수를 측정하고 있어요.",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.Surface,
                lineHeight = 38.sp,
            )
            Text(
                text = "3일 간 측정한 심박수로\n기준 심박수를 계산해 몸 상태를 파악해요.",
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = HeroColors.InputBg,
                lineHeight = 26.sp,
            )
        }
        HorizontalDivider(color = HeroColors.TextPlaceholder)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = BaselineCalibrationManager.dayProgressLabel(activeDay),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.Surface,
            )
            BaselineDayProgressBar(completedDays = completed, activeDayIndex = activeDay)
        }
    }
}

/** Figma 161:1011 — 측정 중지 배너 */
@Composable
fun BaselineMeasurementStoppedBanner(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Black)
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            text = "기준 심박수 측정이 멈췄어요.",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.Surface,
            lineHeight = 38.sp,
        )
        Text(
            text = "기준 심박수 측정을 위해 기기를 착용해주세요.",
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.InputBg,
            lineHeight = 26.sp,
        )
    }
}

@Composable
private fun BaselineDayProgressBar(
    completedDays: Int,
    activeDayIndex: Int,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        repeat(BaselineCalibrationManager.REQUIRED_DAYS) { index ->
            val dayNumber = index + 1
            val fillColor = when {
                dayNumber <= completedDays -> HeroColors.Primary
                dayNumber == activeDayIndex -> HeroColors.Primary
                else -> HeroColors.Border
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(20.dp)
                    .border(1.dp, HeroColors.Primary)
                    .background(fillColor),
            )
        }
    }
}

/** Figma 160:933 / 149:199 — 측정 완료 다이얼로그 */
@Composable
fun BaselineMeasurementCompleteDialog(
    baselineBpm: Double,
    onConfirm: () -> Unit,
) {
    val bpmInt = baselineBpm.roundToInt()
    Dialog(
        onDismissRequest = onConfirm,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(HeroColors.Overlay)
                .clickable(onClick = onConfirm),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                modifier = Modifier
                    .padding(horizontal = 24.dp)
                    .shadow(4.dp, RoundedCornerShape(12.dp))
                    .clip(RoundedCornerShape(12.dp))
                    .background(HeroColors.Surface)
                    .clickable(enabled = false) {}
                    .padding(horizontal = 24.dp, vertical = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                Text(
                    text = "기준 심박수 측정을 완료했어요!",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = HeroColors.TextBody,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                HeartRateDisplay(
                    bpm = bpmInt,
                    heartColor = HeroColors.HeartGreen,
                )
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    BaselineSummaryRow("기준 심박수", "$bpmInt BPM")
                    BaselineSummaryRow(
                        "정상 범위",
                        "${BaselineCalibrationManager.NORMAL_RANGE_LOW} ~ " +
                            "${BaselineCalibrationManager.NORMAL_RANGE_HIGH} BPM",
                    )
                }
                HeroPrimaryButton(text = "확인", onClick = onConfirm)
            }
        }
    }
}

@Composable
private fun BaselineSummaryRow(label: String, value: String) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = HeroColors.TextBody)
        Text(":", fontSize = 16.sp, color = HeroColors.TextBody)
        Text(value, fontSize = 16.sp, fontWeight = FontWeight.Medium, color = HeroColors.TextBody)
    }
}
