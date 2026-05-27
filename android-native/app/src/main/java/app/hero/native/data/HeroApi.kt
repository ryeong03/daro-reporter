package app.hero.heronative.data

import retrofit2.http.Body
import retrofit2.http.POST

interface HeroApi {
    @POST("/users/register")
    suspend fun register(@Body body: RegisterRequest): RegisterResponse

    @POST("/health")
    suspend fun sendHealth(@Body body: HealthDataRequest): HealthDataResponse

    @POST("/alert")
    suspend fun sendAlert(@Body body: AlertRequest): AlertResponse
}

