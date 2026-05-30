package app.hero.heronative.ui

import androidx.compose.ui.graphics.Color
import app.hero.heronative.ui.theme.HeroColors

data class DetectionStyle(
    val label: String,
    val color: Color,
    val cardBackground: Color,
    val heartColor: Color,
    val greeting: String,
    val statusMessage: String,
)

private val configs = mapOf(
    "normal" to DetectionStyle(
        label = "정상",
        color = HeroColors.Primary,
        cardBackground = HeroColors.StatusCardNormal,
        heartColor = HeroColors.HeartGreen,
        greeting = "오늘도 안전한 하루 되세요.",
        statusMessage = "심박수와 활동 모두 건강합니다.",
    ),
    "stage1_hr_high" to DetectionStyle(
        label = "심박 상승",
        color = HeroColors.AiCallOrange,
        cardBackground = HeroColors.AiCallBg,
        heartColor = HeroColors.AiCallOrange,
        greeting = "심박수가 높아요. 잠시 휴식하세요.",
        statusMessage = "휴식이 필요한 상태입니다.",
    ),
    "stage2_waiting_inactive" to DetectionStyle(
        label = "관찰 중",
        color = HeroColors.Warning,
        cardBackground = HeroColors.WarningBg,
        heartColor = HeroColors.Warning,
        greeting = "상태를 확인하고 있어요.",
        statusMessage = "활동 중단이 감지되어 관찰 중입니다.",
    ),
    "observing" to DetectionStyle(
        label = "주의",
        color = HeroColors.Danger,
        cardBackground = HeroColors.StatusCardAlert,
        heartColor = HeroColors.HeartRed,
        greeting = "이상이 감지되었어요.",
        statusMessage = "위급상황이 감지되었습니다.",
    ),
    "alert" to DetectionStyle(
        label = "위험",
        color = HeroColors.Danger,
        cardBackground = HeroColors.StatusCardAlert,
        heartColor = HeroColors.HeartRed,
        greeting = "이상이 감지되었어요.",
        statusMessage = "위급상황이 감지되었습니다.",
    ),
)

fun detectionStyle(state: String): DetectionStyle =
    configs[state] ?: configs.getValue("normal")

fun disconnectedStyle(): DetectionStyle = DetectionStyle(
    label = "미연결",
    color = HeroColors.HeartGray,
    cardBackground = HeroColors.StatusCardDisconnected,
    heartColor = HeroColors.HeartGray,
    greeting = "연결 상태를 확인해주세요.",
    statusMessage = "연결 상태 확인이 필요합니다.",
)

fun isEmergencyState(state: String): Boolean =
    state == "observing" || state == "alert"
