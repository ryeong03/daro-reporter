package app.hero.heronative.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val HeroColorScheme = lightColorScheme(
    primary = HeroColors.Primary,
    onPrimary = Color.White,
    background = HeroColors.Background,
    surface = HeroColors.Surface,
    onBackground = HeroColors.TextPrimary,
    onSurface = HeroColors.TextPrimary,
)

@Composable
fun HeroTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HeroColorScheme,
        content = content
    )
}
