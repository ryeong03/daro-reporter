package app.hero.heronative.health

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultLauncher

/** Health Connect 권한 요청 또는 앱 설정 화면으로 이동한다 */
object HealthConnectNavigator {

    suspend fun openSettingsOrRequestPermissions(
        context: Context,
        healthManager: HealthConnectManager,
        permissionLauncher: ActivityResultLauncher<Set<String>>,
        onUnavailable: () -> Unit = {},
    ) {
        try {
            if (healthManager.hasAllPermissions()) {
                context.startActivity(healthManager.createManageDataIntent())
            } else {
                permissionLauncher.launch(healthManager.permissions)
            }
        } catch (_: ActivityNotFoundException) {
            onUnavailable()
        }
    }

    fun openManageData(context: Context, healthManager: HealthConnectManager): Boolean =
        runCatching {
            context.startActivity(healthManager.createManageDataIntent())
            true
        }.getOrDefault(false)
}
