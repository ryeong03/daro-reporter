package app.hero.heronative.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.ui.theme.HeroColors

@Composable
fun SettingsSectionDivider(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(15.dp)
            .background(HeroColors.InputBg),
    )
}

@Composable
fun SettingsSection(
    title: String,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(HeroColors.Surface)
            .padding(horizontal = 24.dp, vertical = 12.dp),
    ) {
        Text(
            text = title,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
            modifier = Modifier.padding(vertical = 12.dp),
        )
        content()
    }
}

@Composable
fun SettingsValueRow(
    label: String,
    value: String,
    badgeBackground: Color = HeroColors.InputBg,
    showDivider: Boolean = true,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            modifier = Modifier.weight(1f),
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = HeroColors.TextBody,
        )
        Text(
            text = value,
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(badgeBackground)
                .padding(horizontal = 8.dp, vertical = 8.dp),
            fontSize = 14.sp,
            color = HeroColors.TextBody,
        )
    }
    if (showDivider) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(HeroColors.Border),
        )
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
fun ProfileCard(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(4.dp, RoundedCornerShape(12.dp))
            .clip(RoundedCornerShape(12.dp))
            .background(HeroColors.Surface)
            .padding(24.dp),
    ) {
        content()
    }
}

@Composable
fun ProfileNavRow(
    title: String,
    onClick: () -> Unit,
    showDivider: Boolean = false,
) {
    if (showDivider) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(HeroColors.Border),
        )
        Spacer(Modifier.height(8.dp))
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            modifier = Modifier.weight(1f),
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = HeroColors.TextBody,
        )
        Text(
            text = "›",
            fontSize = 32.sp,
            color = HeroColors.TextBody,
        )
    }
}
