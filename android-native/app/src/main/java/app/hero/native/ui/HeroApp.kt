package app.hero.native.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.hero.native.BuildConfig

@Composable
fun HeroApp() {
    Surface(color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "Hero Native", style = MaterialTheme.typography.headlineLarge)
            Text(
                modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
                text = "Kotlin 네이티브 마이그레이션 시작",
                style = MaterialTheme.typography.bodyLarge
            )

            val api = remember { "https://daro-reporter-production.up.railway.app" }
            Text(text = "API: $api", style = MaterialTheme.typography.bodyMedium)
            Text(text = "Build: ${BuildConfig.VERSION_NAME}", style = MaterialTheme.typography.bodyMedium)
        }
    }
}

