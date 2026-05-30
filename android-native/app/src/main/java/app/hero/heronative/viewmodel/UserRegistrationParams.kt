package app.hero.heronative.viewmodel

import app.hero.heronative.data.Guardian

/** 온보딩 등록 API 호출에 필요한 입력 값 */
data class UserRegistrationParams(
    val name: String,
    val phone: String,
    val gender: String?,
    val birthDate: String?,
    val guardians: List<Guardian>,
)
