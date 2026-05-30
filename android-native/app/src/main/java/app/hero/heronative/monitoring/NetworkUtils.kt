package app.hero.heronative.monitoring

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities

/** WiFi·LTE·이더넷 등 실제 인터넷 경로가 있으면 true (공기계 WiFi 테스트용) */
object NetworkUtils {
    fun hasInternet(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return false
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            (
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                )
    }
}
