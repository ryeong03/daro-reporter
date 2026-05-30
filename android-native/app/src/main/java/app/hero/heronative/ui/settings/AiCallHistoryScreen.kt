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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.PhoneMissed
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.ui.theme.HeroColors

enum class AiCallResult(val label: String, val badgeColor: Color) {
    NoAnswer("무응답", Color(0xFF737373)),
    Ended("종료", HeroColors.Primary),
    Rescue("구조요청", HeroColors.Danger),
}

data class AiCallHistoryItem(
    val timestamp: String,
    val result: AiCallResult,
    val answered: Boolean,
)

private val sampleHistory = listOf(
    AiCallHistoryItem("2026. 05. 30. 오전 03:44:44", AiCallResult.NoAnswer, answered = false),
    AiCallHistoryItem("2026. 05. 30. 오전 03:45:44", AiCallResult.Ended, answered = true),
    AiCallHistoryItem("2026. 02. 03. 오전 11:02:43", AiCallResult.Rescue, answered = false),
)

/** Figma 165:355 — AI 콜 이력 */
@Composable
fun AiCallHistoryScreen(
    onBack: () -> Unit,
    items: List<AiCallHistoryItem> = sampleHistory,
) {
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
                text = "AI 콜 이력",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                modifier = Modifier.padding(start = 12.dp),
            )
        }

        SettingsSectionDivider()

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(HeroColors.Surface)
                .padding(horizontal = 24.dp, vertical = 12.dp),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
            ) {
                Text(
                    text = "시각",
                    modifier = Modifier.weight(1f),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = HeroColors.TextBody,
                )
                Text(
                    text = "결과",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = HeroColors.TextBody,
                    modifier = Modifier.padding(end = 8.dp),
                )
            }

            items.forEachIndexed { index, item ->
                AiCallHistoryRow(item)
                if (index < items.lastIndex) {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .padding(vertical = 8.dp)
                            .height(1.dp)
                            .background(HeroColors.Border),
                    )
                }
            }
        }
    }
}

@Composable
private fun AiCallHistoryRow(item: AiCallHistoryItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(
                    if (item.answered) HeroColors.PrimaryLight else HeroColors.DangerBg,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = if (item.answered) Icons.Outlined.Phone else Icons.AutoMirrored.Outlined.PhoneMissed,
                contentDescription = null,
                tint = if (item.answered) HeroColors.Primary else HeroColors.Danger,
                modifier = Modifier.size(24.dp),
            )
        }
        Text(
            text = item.timestamp,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
        )
        Text(
            text = item.result.label,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(item.result.badgeColor)
                .padding(horizontal = 8.dp, vertical = 8.dp),
            fontSize = 14.sp,
            color = Color.White,
        )
    }
}
