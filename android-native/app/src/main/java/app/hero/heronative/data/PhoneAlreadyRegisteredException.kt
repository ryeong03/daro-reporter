package app.hero.heronative.data

/** 등록 API 409 후 전화번호로 사용자 조회에 실패한 경우 */
class PhoneAlreadyRegisteredException(
    val phone: String,
    cause: Throwable? = null,
) : Exception("Phone already registered: $phone", cause)
