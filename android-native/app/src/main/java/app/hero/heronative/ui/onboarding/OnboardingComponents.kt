package app.hero.heronative.ui.onboarding

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.outlined.CheckCircleOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.hero.heronative.ui.components.HeroPrimaryButton
import app.hero.heronative.ui.components.HeroSecondaryButton
import app.hero.heronative.ui.theme.HeroColors

@Composable
fun HeroLogoText(modifier: Modifier = Modifier) {
    Text(
        text = "Hero",
        modifier = modifier,
        fontSize = 40.sp,
        fontWeight = FontWeight.ExtraBold,
        color = HeroColors.PrimaryDark,
    )
}

@Composable
fun OnboardingProgressBar(currentStep: Int, totalSteps: Int = 3) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        repeat(totalSteps) { index ->
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(4.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        if (index < currentStep) HeroColors.Primary else HeroColors.ProgressInactive,
                    ),
            )
        }
    }
}

@Composable
fun OnboardingHeader(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        Text(
            text = title,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextPrimary,
            lineHeight = 38.sp,
        )
        if (subtitle != null) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = subtitle,
                fontSize = 14.sp,
                color = HeroColors.TextPrimary,
                lineHeight = 22.sp,
            )
        }
    }
}

@Composable
fun HeroFormField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = label,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
        )
        Spacer(Modifier.height(12.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(HeroColors.InputBg)
                .padding(horizontal = 16.dp),
            textStyle = TextStyle(
                fontSize = 16.sp,
                color = if (value.isBlank()) HeroColors.TextPlaceholder else HeroColors.TextBody,
            ),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
            cursorBrush = SolidColor(HeroColors.Primary),
            decorationBox = { inner ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (value.isEmpty()) {
                        Text(placeholder, color = HeroColors.TextPlaceholder, fontSize = 16.sp)
                    }
                    inner()
                }
            },
        )
    }
}

@Composable
fun OnboardingBottomActions(
    primaryText: String,
    onPrimary: () -> Unit,
    secondaryText: String,
    onSecondary: () -> Unit,
    primaryEnabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        HeroPrimaryButton(primaryText, onPrimary, enabled = primaryEnabled)
        HeroSecondaryButton(secondaryText, onSecondary)
    }
}

@Composable
fun HeroIntroGradientBackground(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(HeroColors.Surface, HeroColors.IntroGradientEnd),
                ),
            ),
    ) {
        content()
    }
}

@Composable
fun HeroSplashGradientBackground(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(HeroColors.Primary, HeroColors.SplashEnd),
                ),
            ),
    ) {
        content()
    }
}

@Composable
fun HeroIntroCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(8.dp, RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .background(HeroColors.Surface)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        content()
    }
}

enum class ConnectionBadgeState {
    Connected,
    Disconnected,
    Checking,
}

@Composable
fun ConnectionBadge(state: ConnectionBadgeState) {
    val (label, bg) = when (state) {
        ConnectionBadgeState.Connected -> "연결됨" to HeroColors.PrimaryLight
        ConnectionBadgeState.Disconnected -> "미연결" to HeroColors.DangerBadgeBg
        ConnectionBadgeState.Checking -> "확인중" to HeroColors.InputBg
    }
    Text(
        text = label,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 8.dp),
        fontSize = 14.sp,
        color = HeroColors.TextBody,
    )
}

@Composable
fun ConsentCheckRow(
    label: String,
    checked: Boolean,
    onToggle: () -> Unit,
    showChevron: Boolean = false,
    onChevronClick: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (!showChevron) Modifier.clickable(onClick = onToggle) else Modifier)
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .clickable(onClick = onToggle),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(
                imageVector = if (checked) Icons.Filled.CheckCircle else Icons.Outlined.CheckCircleOutline,
                contentDescription = null,
                tint = if (checked) HeroColors.PrimaryDark else HeroColors.ProgressInactive,
                modifier = Modifier.size(24.dp),
            )
            Text(
                text = label,
                fontSize = if (showChevron) 14.sp else 18.sp,
                fontWeight = FontWeight.Medium,
                color = HeroColors.TextLabel,
            )
        }
        if (showChevron && onChevronClick != null) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = HeroColors.ProgressInactive,
                modifier = Modifier
                    .size(24.dp)
                    .clickable(onClick = onChevronClick),
            )
        }
    }
}

@Composable
fun HeroAlertDialog(
    message: String,
    confirmText: String = "확인",
    onConfirm: () -> Unit,
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
                    .padding(horizontal = 24.dp, vertical = 48.dp)
                    .clickable(enabled = false) {},
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                Text(
                    text = message,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = HeroColors.TextBody,
                    lineHeight = 29.sp,
                    textAlign = TextAlign.Center,
                )
                HeroPrimaryButton(confirmText, onConfirm)
            }
        }
    }
}
