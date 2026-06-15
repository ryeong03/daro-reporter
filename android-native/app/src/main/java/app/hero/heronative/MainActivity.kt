package app.hero.heronative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import app.hero.heronative.health.BluetoothWatchDetector
import app.hero.heronative.monitoring.MonitoringStateHolder
import app.hero.heronative.ui.navigation.HeroNavHost
import app.hero.heronative.ui.theme.HeroTheme
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

class MainActivity : ComponentActivity() {

    private val bluetoothPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* 화면 폴링에서 재확인 */ }

    private val debugHeartRateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (!BuildConfig.DEBUG) return
            val bpm = intent.getIntExtra(EXTRA_BPM, 180).coerceIn(30, 250)
            val state = intent.getStringExtra(EXTRA_STATE) ?: "stage1_hr_high"
            val now = Instant.now()
            MonitoringStateHolder.setDebugHeartRate(
                bpm = bpm,
                detectionState = state,
                measuredAtLabel = timeFormatter.format(now),
                measuredAtEpochMs = now.toEpochMilli(),
            )
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        requestBluetoothPermissionIfNeeded()
        registerDebugHeartRateReceiver()
        enableEdgeToEdge()
        setContent {
            HeroTheme {
                HeroNavHost()
            }
        }
    }

    override fun onDestroy() {
        unregisterDebugHeartRateReceiver()
        super.onDestroy()
    }

    private fun requestBluetoothPermissionIfNeeded() {
        val permission = BluetoothWatchDetector.requiredBluetoothPermission() ?: return
        if (!BluetoothWatchDetector.hasBluetoothPermission(this)) {
            bluetoothPermissionLauncher.launch(permission)
        }
    }

    private fun registerDebugHeartRateReceiver() {
        if (!BuildConfig.DEBUG) return
        val filter = IntentFilter(ACTION_DEBUG_HEART_RATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(debugHeartRateReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(debugHeartRateReceiver, filter)
        }
    }

    private fun unregisterDebugHeartRateReceiver() {
        if (!BuildConfig.DEBUG) return
        runCatching { unregisterReceiver(debugHeartRateReceiver) }
    }

    companion object {
        private const val ACTION_DEBUG_HEART_RATE = "app.hero.heronative.DEBUG_HEART_RATE"
        private const val EXTRA_BPM = "bpm"
        private const val EXTRA_STATE = "state"
        private val timeFormatter =
            DateTimeFormatter.ofPattern("HH:mm:ss", Locale.KOREA).withZone(ZoneId.systemDefault())
    }
}
