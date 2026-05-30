package app.hero.heronative.baseline

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.baselineStore by preferencesDataStore(name = "hero_baseline_calibration")

class BaselineCalibrationStore(private val context: Context) {
    private object Keys {
        val STATUS = stringPreferencesKey("status")
        val COMPLETED_DAYS = stringSetPreferencesKey("completed_days")
        val TODAY_DATE = stringPreferencesKey("today_date")
        val TODAY_SAMPLES = intPreferencesKey("today_samples")
        val PENDING_DIALOG = booleanPreferencesKey("pending_dialog")
        val LAST_BASELINE = stringPreferencesKey("last_baseline_bpm")
        val MIGRATED = booleanPreferencesKey("migrated_legacy")
    }

    val state: Flow<BaselineCalibrationState> = context.baselineStore.data.map { prefs ->
        BaselineCalibrationState(
            status = prefs[Keys.STATUS]?.let {
                runCatching { BaselineCalibrationStatus.valueOf(it) }.getOrNull()
            } ?: BaselineCalibrationStatus.NOT_STARTED,
            completedDayDates = prefs[Keys.COMPLETED_DAYS] ?: emptySet(),
            todaySampleCount = prefs[Keys.TODAY_SAMPLES] ?: 0,
            todayDate = prefs[Keys.TODAY_DATE] ?: "",
            pendingCompletionDialog = prefs[Keys.PENDING_DIALOG] ?: false,
            lastComputedBaselineBpm = prefs[Keys.LAST_BASELINE]?.toDoubleOrNull(),
        )
    }

    suspend fun readOnce(): BaselineCalibrationState = state.first()

    suspend fun isLegacyMigrated(): Boolean =
        context.baselineStore.data.first()[Keys.MIGRATED] == true

    suspend fun markLegacyCompleted() {
        context.baselineStore.edit {
            it[Keys.STATUS] = BaselineCalibrationStatus.COMPLETED.name
            it[Keys.MIGRATED] = true
            it[Keys.PENDING_DIALOG] = false
        }
    }

    suspend fun startMeasuring() {
        context.baselineStore.edit {
            it[Keys.STATUS] = BaselineCalibrationStatus.IN_PROGRESS.name
            it[Keys.COMPLETED_DAYS] = emptySet()
            it[Keys.TODAY_DATE] = ""
            it[Keys.TODAY_SAMPLES] = 0
            it[Keys.PENDING_DIALOG] = false
            it.remove(Keys.LAST_BASELINE)
            it[Keys.MIGRATED] = true
        }
    }

    suspend fun write(state: BaselineCalibrationState) {
        context.baselineStore.edit {
            it[Keys.STATUS] = state.status.name
            it[Keys.COMPLETED_DAYS] = state.completedDayDates
            it[Keys.TODAY_DATE] = state.todayDate
            it[Keys.TODAY_SAMPLES] = state.todaySampleCount
            it[Keys.PENDING_DIALOG] = state.pendingCompletionDialog
            if (state.lastComputedBaselineBpm != null) {
                it[Keys.LAST_BASELINE] = state.lastComputedBaselineBpm.toString()
            } else {
                it.remove(Keys.LAST_BASELINE)
            }
            it[Keys.MIGRATED] = true
        }
    }

    suspend fun clear() {
        context.baselineStore.edit { it.clear() }
    }
}
