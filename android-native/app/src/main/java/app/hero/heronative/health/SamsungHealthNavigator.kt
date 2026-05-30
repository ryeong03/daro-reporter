package app.hero.heronative.health

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings

/** 삼성헬스·Galaxy Wearable·Health Connect 설정으로 안내 */
object SamsungHealthNavigator {

    const val SAMSUNG_HEALTH_PACKAGE = "com.sec.android.app.shealth"
    const val GALAXY_WEARABLE_PACKAGE = "com.samsung.android.app.watchmanager"
    const val HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata"

    fun openSamsungHealth(context: Context): Boolean =
        launchPackage(context, SAMSUNG_HEALTH_PACKAGE)

    fun openGalaxyWearable(context: Context): Boolean =
        launchPackage(context, GALAXY_WEARABLE_PACKAGE) ||
            launchPackage(context, "com.samsung.android.wearable")

    fun openHealthConnectApp(context: Context): Boolean =
        launchPackage(context, HEALTH_CONNECT_PACKAGE)

    /** 앱 정보 화면 (Health Connect / 삼성헬스 권한 확인용) */
    fun openAppSettings(context: Context, packageName: String): Boolean =
        runCatching {
            context.startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:$packageName")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                },
            )
            true
        }.getOrDefault(false)

    private fun launchPackage(context: Context, packageName: String): Boolean =
        runCatching {
            val launch = context.packageManager.getLaunchIntentForPackage(packageName)
                ?: return false
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(launch)
            true
        }.getOrDefault(false)

    fun isInstalled(context: Context, packageName: String): Boolean =
        runCatching {
            context.packageManager.getPackageInfo(packageName, 0)
            true
        }.getOrDefault(false)
}
