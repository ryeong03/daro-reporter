package app.hero.native.data

import android.content.Context
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "hero_user")

class UserStore(private val context: Context) {
    private object Keys {
        val USER_ID = stringPreferencesKey("user_id")
        val USER_NAME = stringPreferencesKey("user_name")
        val DEVICE_ID = stringPreferencesKey("device_id")
        val PHONE = stringPreferencesKey("phone")
        val BASELINE_BPM = doublePreferencesKey("baseline_bpm")
    }

    val userId: Flow<String?> = context.dataStore.data.map { it[Keys.USER_ID] }
    val deviceId: Flow<String?> = context.dataStore.data.map { it[Keys.DEVICE_ID] }

    suspend fun saveUser(
        id: String,
        name: String,
        deviceId: String,
        phone: String,
        baselineBpm: Double
    ) {
        context.dataStore.edit {
            it[Keys.USER_ID] = id
            it[Keys.USER_NAME] = name
            it[Keys.DEVICE_ID] = deviceId
            it[Keys.PHONE] = phone
            it[Keys.BASELINE_BPM] = baselineBpm
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}

