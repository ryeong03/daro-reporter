package app.hero.heronative.ui

import androidx.compose.ui.graphics.Color
import app.hero.heronative.ui.theme.HeroColors

data class DetectionStyle(
    val label: String,
    val color: Color,
    val background: Color,
    val description: String
)

private val configs = mapOf(
    "normal" to DetectionStyle("정상", HeroColors.Primary, HeroColors.PrimaryLight, "모든 수치가 정상 범위입니다"),
    "stage1_hr_high" to DetectionStyle("심박 상승", HeroColors.Warning, HeroColors.WarningBg, "심박수가 높아지고 있습니다"),
    "stage2_waiting_inactive" to DetectionStyle("관찰 중", HeroColors.Warning, HeroColors.WarningBg, "활동 중단 감지, 관찰 중입니다"),
    "observing" to DetectionStyle("주의", HeroColors.Danger, HeroColors.DangerBg, "이상 징후 관찰 중입니다"),
    "alert" to DetectionStyle("위험", HeroColors.Danger, HeroColors.DangerBg, "AI 확인 전화가 진행 중입니다")
)

fun detectionStyle(state: String): DetectionStyle =
    configs[state] ?: configs.getValue("normal")
