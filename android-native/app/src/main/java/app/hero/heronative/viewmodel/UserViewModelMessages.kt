package app.hero.heronative.viewmodel

/** ViewModel에서 UI로 전달하는 사용자 메시지 */
internal object UserViewModelMessages {
    const val REGISTER_FAILED = "등록에 실패했습니다"

    fun registerError(cause: Throwable?): String =
        cause?.message?.takeIf { it.isNotBlank() } ?: REGISTER_FAILED
}
