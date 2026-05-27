package app.hero.native.monitoring

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.hero.native.data.HealthDataRequest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private val Context.queueStore by preferencesDataStore(name = "hero_queue")

class OfflineQueueStore(
    private val context: Context,
    private val json: Json = Json { ignoreUnknownKeys = true }
) {
    private val key = stringPreferencesKey("health_queue_json")

    suspend fun enqueue(item: HealthDataRequest) {
        val current = load()
        val next = (current + item).takeLast(100)
        context.queueStore.edit { it[key] = json.encodeToString(next) }
    }

    suspend fun load(): List<HealthDataRequest> {
        val raw = context.queueStore.data.map { it[key] }.first() ?: return emptyList()
        return runCatching { json.decodeFromString<List<HealthDataRequest>>(raw) }.getOrElse { emptyList() }
    }

    suspend fun replace(all: List<HealthDataRequest>) {
        context.queueStore.edit {
            if (all.isEmpty()) it.remove(key) else it[key] = json.encodeToString(all)
        }
    }
}

