package app.hero.heronative.ui.home

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MonitorHeart
import androidx.compose.material.icons.outlined.SignalCellularAlt
import androidx.compose.material.icons.outlined.Watch
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.ui.theme.HeroColors

@Composable
fun HomeStatusCard(
    statusMessage: String,
    heartRate: Int,
    heartColor: Color,
    cardBackground: Color,
    lastUpdatedLabel: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(elevation = 8.dp, shape = RoundedCornerShape(12.dp), clip = false)
            .clip(RoundedCornerShape(12.dp))
            .background(cardBackground)
            .padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "현재 상태",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
            )
            Text(
                text = lastUpdatedLabel,
                fontSize = 14.sp,
                color = HeroColors.TextBody,
            )
        }
        Text(
            text = statusMessage,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )
        HeartRateDisplay(
            bpm = heartRate,
            heartColor = heartColor,
        )
    }
}

@Composable
fun HeartRateDisplay(
    bpm: Int,
    heartColor: Color,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.size(250.dp),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.size(width = 218.dp, height = 190.dp)) {
            val path = Path().apply {
                val w = size.width
                val h = size.height
                moveTo(w / 2f, h * 0.28f)
                cubicTo(w * 0.9f, h * -0.05f, w * 1.05f, h * 0.45f, w / 2f, h * 0.92f)
                cubicTo(w * -0.05f, h * 0.45f, w * 0.1f, h * -0.05f, w / 2f, h * 0.28f)
                close()
            }
            drawPath(
                path = path,
                color = heartColor,
                style = Stroke(width = 14.dp.toPx(), cap = StrokeCap.Round),
            )
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = if (bpm > 0) "$bpm" else "--",
                fontSize = 50.sp,
                fontWeight = FontWeight.Black,
                color = HeroColors.TextPrimary,
            )
            Text(
                text = "BPM",
                fontSize = 14.sp,
                fontWeight = FontWeight.Light,
                color = HeroColors.TextPrimary,
            )
        }
    }
}

@Composable
fun HealthConnectSyncHintBanner(
    permissionsGranted: Boolean,
    onOpenHealthConnect: () -> Unit,
    onOpenSamsungHealth: () -> Unit,
    onOpenGuide: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(HeroColors.StatusCardNormal)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = if (permissionsGranted) {
                "삼성헬스에 심박이 있어도 Health Connect로 공유되지 않으면 Hero에 표시되지 않아요.\n" +
                    "Samsung Health → 설정 → Health Connect(「애플리케이션」) → 심박 데이터 공유를 확인해주세요."
            } else {
                "Hero가 Health Connect에서 심박을 읽을 권한이 필요해요. 아래에서 권한을 허용해주세요."
            },
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
            lineHeight = 22.sp,
        )
        if (permissionsGranted) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                HintActionChip(text = "Samsung Health", onClick = onOpenSamsungHealth)
                HintActionChip(text = "Health Connect", onClick = onOpenHealthConnect)
                HintActionChip(text = "설정 안내", onClick = onOpenGuide)
            }
        } else {
            HintActionChip(text = "Health Connect 권한 허용", onClick = onOpenHealthConnect)
        }
    }
}

@Composable
private fun HintActionChip(
    text: String,
    onClick: () -> Unit,
) {
    Text(
        text = text,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(HeroColors.Surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        fontSize = 13.sp,
        fontWeight = FontWeight.Medium,
        color = HeroColors.Primary,
    )
}

data class ConnectionItem(
    val icon: ImageVector,
    val title: String,
    val connected: Boolean,
    val onClick: (() -> Unit)? = null,
)

@Composable
fun HomeConnectionCard(
    items: List<ConnectionItem>,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(elevation = 4.dp, shape = RoundedCornerShape(12.dp), clip = false)
            .clip(RoundedCornerShape(12.dp))
            .background(HeroColors.Surface)
            .padding(horizontal = 12.dp, vertical = 12.dp),
    ) {
        Text(
            text = "연결 상태",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )
        items.forEachIndexed { index, item ->
            ConnectionStatusRow(
                icon = item.icon,
                title = item.title,
                connected = item.connected,
                onClick = item.onClick,
            )
            if (index < items.lastIndex) {
                Spacer(Modifier.height(8.dp))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(1.dp)
                        .background(HeroColors.Border),
                )
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun ConnectionStatusRow(
    icon: ImageVector,
    title: String,
    connected: Boolean,
    onClick: (() -> Unit)?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (onClick != null) {
                    Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(onClick = onClick)
                } else {
                    Modifier
                },
            )
            .padding(horizontal = 16.dp, vertical = 8.dp),
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
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = HeroColors.Primary,
                modifier = Modifier.size(24.dp),
            )
        }
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
        )
        StatusBadge(connected = connected)
    }
}

@Composable
private fun StatusBadge(connected: Boolean) {
    val label = when {
        connected -> "연결됨"
        else -> "미연결"
    }
        Text(
            text = label,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(
                    when {
                        connected -> HeroColors.PrimaryLight
                        else -> HeroColors.DangerBadgeBg
                    },
                )
                .padding(horizontal = 8.dp, vertical = 8.dp),
        fontSize = 14.sp,
        color = HeroColors.TextBody,
    )
}

/** Figma 연결 상태 아이콘 */
object HomeConnectionIcons {
    val Device = Icons.Outlined.Watch
    val HealthApp = Icons.Outlined.MonitorHeart
    val Lte = Icons.Outlined.SignalCellularAlt
}
