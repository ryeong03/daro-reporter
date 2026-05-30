package app.hero.heronative.ui.components

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.hero.heronative.ui.theme.HeroColors

/**
 * 공통 상단 네비게이션 — 뒤로 / 제목 / 홈·설정 액션
 */
@Composable
fun HeroScreenTopBar(
    modifier: Modifier = Modifier,
    title: String? = null,
    showBack: Boolean = true,
    onBack: (() -> Unit)? = null,
    showHome: Boolean = false,
    homeSelected: Boolean = false,
    onNavigateHome: (() -> Unit)? = null,
    showSettings: Boolean = false,
    onOpenSettings: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp)
            .padding(top = 65.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (showBack && onBack != null) {
            IconButton(onClick = onBack, modifier = Modifier.size(40.dp)) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "뒤로",
                    tint = HeroColors.TextPrimary,
                )
            }
        } else if (showHome && homeSelected) {
            IconButton(onClick = {}, enabled = false, modifier = Modifier.size(40.dp)) {
                Icon(
                    Icons.Filled.Home,
                    contentDescription = "홈",
                    tint = HeroColors.PrimaryDark,
                )
            }
        } else {
            Spacer(Modifier.size(40.dp))
        }

        if (!title.isNullOrBlank()) {
            Text(
                text = title,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = HeroColors.TextBody,
                modifier = Modifier.padding(start = 4.dp),
            )
        }

        Spacer(Modifier.weight(1f))

        if (showHome && !homeSelected && onNavigateHome != null) {
            IconButton(onClick = onNavigateHome, modifier = Modifier.size(40.dp)) {
                Icon(
                    Icons.Outlined.Home,
                    contentDescription = "홈으로",
                    tint = HeroColors.TextPrimary,
                )
            }
        }
        if (showSettings && onOpenSettings != null) {
            IconButton(onClick = onOpenSettings, modifier = Modifier.size(40.dp)) {
                Icon(
                    Icons.Outlined.Settings,
                    contentDescription = "설정",
                    tint = HeroColors.TextPrimary,
                )
            }
        }
    }
}
