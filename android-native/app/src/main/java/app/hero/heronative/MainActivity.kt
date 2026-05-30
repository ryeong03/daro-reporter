package app.hero.heronative

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import app.hero.heronative.health.BluetoothWatchDetector
import app.hero.heronative.ui.navigation.HeroNavHost
import app.hero.heronative.ui.theme.HeroTheme

class MainActivity : ComponentActivity() {

    private val bluetoothPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* 화면 폴링에서 재확인 */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        requestBluetoothPermissionIfNeeded()
        enableEdgeToEdge()
        setContent {
            HeroTheme {
                HeroNavHost()
            }
        }
    }

    private fun requestBluetoothPermissionIfNeeded() {
        val permission = BluetoothWatchDetector.requiredBluetoothPermission() ?: return
        if (!BluetoothWatchDetector.hasBluetoothPermission(this)) {
            bluetoothPermissionLauncher.launch(permission)
        }
    }
}
