package app.hero.heronative.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.components.HeroSecondaryButton
import app.hero.heronative.ui.theme.HeroColors

/** Figma 157:256 — 홈 상단 AI 콜 진행 배너 */
@Composable
fun AiCallBanner(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(12.dp))
            .border(4.dp, HeroColors.AiCallOrange, RoundedCornerShape(12.dp))
            .background(HeroColors.AiCallBg, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 16.dp),
    ) {
        Text(
            text = "AI 콜 진행중",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = "통화가 진행중입니다.",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Figma 156:491 — AI 콜 진행 모달 */
@Composable
fun AiCallDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .shadow(4.dp, RoundedCornerShape(12.dp))
                .border(4.dp, HeroColors.AiCallOrange, RoundedCornerShape(12.dp))
                .background(HeroColors.AiCallBg, RoundedCornerShape(12.dp))
                .padding(horizontal = 24.dp, vertical = 48.dp),
        ) {
            Text(
                text = "AI 콜 진행중",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = "히어로가 전화하고 있습니다.\n전화를 받아주세요!",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                textAlign = TextAlign.Center,
                lineHeight = 29.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 24.dp, bottom = 24.dp),
            )
            HeroPrimaryButton(
                text = "확인",
                onClick = onConfirm,
            )
        }
    }
}

fun formatLastUpdated(
    lastHeartRateAt: String?,
    lastHcCheckedAt: String? = null,
    lastServerSync: String? = null,
): String {
    return when {
        !lastHeartRateAt.isNullOrBlank() -> "심박 수신 $lastHeartRateAt"
        !lastHcCheckedAt.isNullOrBlank() -> "조회 $lastHcCheckedAt · 심박 대기"
        !lastServerSync.isNullOrBlank() -> "서버 전송 $lastServerSync"
        else -> "수신 대기 중"
    }
}

/** Figma 157:350 — 보건소 연계 배너 */
@Composable
fun HealthCenterBanner(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(12.dp))
            .border(4.dp, HeroColors.EmergencyRed, RoundedCornerShape(12.dp))
            .background(HeroColors.Surface, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 16.dp),
    ) {
        Text(
            text = "보건소 연계중",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.EmergencyRed,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = "보건소 연계가 진행중입니다.\n본 알림은 관리자만 해제 가능합니다.",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
            textAlign = TextAlign.Center,
            lineHeight = 29.sp,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Figma 157:239 — 기기 미연결 (157:240 딤 + 카드) */
@Composable
fun DeviceNotConnectedDialog(onConfirm: () -> Unit) {
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
                    .padding(horizontal = 16.dp)
                    .shadow(4.dp, RoundedCornerShape(16.dp))
                    .clip(RoundedCornerShape(16.dp))
                    .background(HeroColors.Surface)
                    .clickable(enabled = false) {}
                    .padding(horizontal = 16.dp, vertical = 48.dp),
            ) {
                Text(
                    text = "기기가 연결되어있지 않아요.\n갤럭시 핏 또는 스마트 워치를 켜고\n내 휴대폰과 블루투스 연결해주세요",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = HeroColors.TextBody,
                    lineHeight = 29.sp,
                    modifier = Modifier.padding(bottom = 24.dp),
                )
                HeroPrimaryButton(text = "확인", onClick = onConfirm)
            }
        }
    }
}

/** Figma 156:499 — AI 콜 이상 없음 확인 */
@Composable
fun AiCallSafeDialog(userName: String, onConfirm: () -> Unit) {
    HeroBorderedDialog(
        borderColor = HeroColors.Primary,
        title = "이상 없음을 확인하였습니다.",
        message = "${userName}님의 상태를 확인하였습니다.\n몸이 힘들 땐 쉬어가며 일하세요!",
        onConfirm = onConfirm,
    )
}

/** Figma 156:501 — AI 콜 긴급 / 보건소 연계 */
@Composable
fun AiCallEmergencyDialog(
    onConfirm: () -> Unit,
    onDismissEmergency: () -> Unit,
) {
    Dialog(
        onDismissRequest = onDismissEmergency,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .shadow(4.dp, RoundedCornerShape(12.dp))
                .border(4.dp, HeroColors.EmergencyRed, RoundedCornerShape(12.dp))
                .background(HeroColors.Surface, RoundedCornerShape(12.dp))
                .padding(horizontal = 24.dp, vertical = 48.dp),
        ) {
            Text(
                text = "보건소 연계 중",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.EmergencyRed,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = "구조가 필요한 상황입니다.\n보호자에게 위치가 전송됩니다.",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                textAlign = TextAlign.Center,
                lineHeight = 29.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
            )
            HeroPrimaryButton(text = "확인", onClick = onConfirm)
            Spacer(Modifier.height(12.dp))
            HeroSecondaryButton(
                text = "현재 구조가 필요하지 않습니다.",
                onClick = onDismissEmergency,
            )
        }
    }
}

@Composable
private fun HeroInfoDialog(message: String, onConfirm: () -> Unit) {
    Dialog(
        onDismissRequest = onConfirm,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .shadow(4.dp, RoundedCornerShape(12.dp))
                .background(HeroColors.Surface, RoundedCornerShape(12.dp))
                .padding(horizontal = 24.dp, vertical = 48.dp),
        ) {
            Text(
                text = message,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                lineHeight = 29.sp,
                modifier = Modifier.padding(bottom = 24.dp),
            )
            HeroPrimaryButton(text = "확인", onClick = onConfirm)
        }
    }
}

@Composable
private fun HeroBorderedDialog(
    borderColor: Color,
    title: String,
    message: String,
    onConfirm: () -> Unit,
) {
    Dialog(
        onDismissRequest = onConfirm,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 24.dp)
                .shadow(4.dp, RoundedCornerShape(12.dp))
                .border(4.dp, borderColor, RoundedCornerShape(12.dp))
                .background(HeroColors.Surface, RoundedCornerShape(12.dp))
                .padding(horizontal = 24.dp, vertical = 48.dp),
        ) {
            Text(
                text = title,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                text = message,
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = HeroColors.TextBody,
                textAlign = TextAlign.Center,
                lineHeight = 26.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 24.dp),
            )
            HeroPrimaryButton(text = "확인", onClick = onConfirm)
        }
    }
}
