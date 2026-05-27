package app.hero.heronative.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Looper
import androidx.core.content.ContextCompat
import app.hero.heronative.data.LocationData
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

class LocationProvider(context: Context) {
    private val appContext = context.applicationContext
    private val fused = LocationServices.getFusedLocationProviderClient(appContext)

    @Volatile
    var lastLocation: LocationData? = null
        private set

    fun hasFineLocation(): Boolean =
        ContextCompat.checkSelfPermission(appContext, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    suspend fun getCurrentLocation(): LocationData? {
        if (!hasFineLocation()) return null

        val cached = lastLocation
        if (cached != null) return cached

        return withTimeoutOrNull(LOCATION_TIMEOUT_MS) {
            fetchCurrentLocation()
        }
    }

    private suspend fun fetchCurrentLocation(): LocationData? {
        val last = suspendCancellableCoroutine { cont ->
            fused.lastLocation
                .addOnSuccessListener { loc ->
                    if (loc != null) {
                        cont.resume(
                            LocationData(
                                lat = loc.latitude,
                                lng = loc.longitude,
                                accuracy = loc.accuracy.toDouble()
                            )
                        )
                    } else {
                        cont.resume(null)
                    }
                }
                .addOnFailureListener { cont.resume(null) }
        }
        if (last != null) {
            lastLocation = last
            return last
        }

        return suspendCancellableCoroutine { cont ->
            val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10_000L)
                .setMaxUpdates(1)
                .build()
            val callback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    fused.removeLocationUpdates(this)
                    val loc = result.lastLocation
                    if (loc != null) {
                        val data = LocationData(
                            lat = loc.latitude,
                            lng = loc.longitude,
                            accuracy = loc.accuracy.toDouble()
                        )
                        lastLocation = data
                        cont.resume(data)
                    } else {
                        cont.resume(null)
                    }
                }
            }
            fused.requestLocationUpdates(request, callback, Looper.getMainLooper())
            cont.invokeOnCancellation { fused.removeLocationUpdates(callback) }
        }
    }

    private companion object {
        const val LOCATION_TIMEOUT_MS = 20_000L
    }
}
