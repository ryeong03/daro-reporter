package app.hero.heronative.health

import android.content.ActivityNotFoundException
import android.content.Context
import androidx.activity.result.ActivityResultLauncher

/** Health Connect 권한 요청 또는 앱 설정 화면으로 이동한다 */
object HealthConnectNavigator {

    suspend fun openSettingsOrRequestPermissions(
        context: Context,
        healthManager: HealthConnectManager,
        permissionLauncher: ActivityResultLauncher<Set<String>>,
        onUnavailable: () -> Unit = {},
    ) {
        if (!healthManager.isAvailable) {
            onUnavailable()
            return
        }
        try {
            if (healthManager.hasAllPermissions()) {
                healthManager.createManageDataIntent()?.let { context.startActivity(it) }
                    ?: onUnavailable()
            } else {
                permissionLauncher.launch(healthManager.permissions)
            }
        } catch (_: ActivityNotFoundException) {
            onUnavailable()
        }
    }

    fun openManageData(context: Context, healthManager: HealthConnectManager): Boolean =
        runCatching {
            val intent = healthManager.createManageDataIntent() ?: return false
            context.startActivity(intent)
            true
        }.getOrDefault(false)
}
