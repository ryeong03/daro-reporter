package app.hero.heronative.baseline

enum class BaselineCalibrationStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED,
}

data class BaselineCalibrationState(
    val status: BaselineCalibrationStatus = BaselineCalibrationStatus.NOT_STARTED,
    val completedDayDates: Set<String> = emptySet(),
    val todaySampleCount: Int = 0,
    val todayDate: String = "",
    val pendingCompletionDialog: Boolean = false,
    val lastComputedBaselineBpm: Double? = null,
) {
    val activeDayIndex: Int
        get() {
            val completed = completedDayDates.size
            if (completed >= BaselineCalibrationManager.REQUIRED_DAYS) return BaselineCalibrationManager.REQUIRED_DAYS
            return (completed + 1).coerceAtMost(BaselineCalibrationManager.REQUIRED_DAYS)
        }

    val isMeasuring: Boolean get() = status == BaselineCalibrationStatus.IN_PROGRESS
}
