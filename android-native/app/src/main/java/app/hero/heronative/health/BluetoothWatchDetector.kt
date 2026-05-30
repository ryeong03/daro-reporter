package app.hero.heronative.health

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothClass
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat

/**
 * Bluetooth API로 페어링된 워치·밴드를 감지한다.
 * Galaxy Fit3 (100A) 등 삼성헬스 동기화 없이 BT만 된 공기계 테스트용.
 */
object BluetoothWatchDetector {

    private val WATCH_NAME_PATTERNS = listOf(
        Regex("galaxy\\s*fit", RegexOption.IGNORE_CASE),
        Regex("galaxy\\s*watch", RegexOption.IGNORE_CASE),
        Regex("gear\\s*s", RegexOption.IGNORE_CASE),
        Regex("fit\\s*3", RegexOption.IGNORE_CASE),
        Regex("fit3", RegexOption.IGNORE_CASE),
        Regex("sm-r\\d", RegexOption.IGNORE_CASE),
        Regex("\\(100\\s*a\\)", RegexOption.IGNORE_CASE),
        Regex("watch", RegexOption.IGNORE_CASE),
    )

    fun hasBluetoothPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT,
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    fun requiredBluetoothPermission(): String? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Manifest.permission.BLUETOOTH_CONNECT
        } else {
            null
        }

    fun isBluetoothEnabled(context: Context): Boolean =
        bluetoothAdapter(context)?.isEnabled == true

    /** 페어링(bonded) 목록에 워치/웨어러블이 있으면 true */
    fun hasBondedWatch(context: Context): Boolean =
        bondedWatchDevices(context).isNotEmpty()

    fun bondedWatchNames(context: Context): List<String> =
        bondedWatchDevices(context).mapNotNull { it.name }

    fun bondedWatchDevices(context: Context): List<BluetoothDevice> {
        if (!hasBluetoothPermission(context)) return emptyList()
        val adapter = bluetoothAdapter(context) ?: return emptyList()
        if (!adapter.isEnabled) return emptyList()
        return runCatching {
            adapter.bondedDevices.orEmpty().filter { isLikelyWatch(it) }
        }.getOrDefault(emptyList())
    }

    internal fun isLikelyWatch(device: BluetoothDevice): Boolean {
        if (matchesWatchName(device.name)) return true
        val major = device.bluetoothClass?.majorDeviceClass
        return major == BluetoothClass.Device.Major.WEARABLE
    }

    internal fun matchesWatchName(name: String?): Boolean {
        if (name.isNullOrBlank()) return false
        return WATCH_NAME_PATTERNS.any { it.containsMatchIn(name) }
    }

    private fun bluetoothAdapter(context: Context): BluetoothAdapter? {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return manager?.adapter
    }
}
