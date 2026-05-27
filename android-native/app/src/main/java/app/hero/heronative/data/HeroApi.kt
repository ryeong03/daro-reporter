package app.hero.heronative.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface HeroApi {
    @POST("/users/register")
    suspend fun register(@Body body: RegisterRequest): RegisterResponse

    @GET("/users/by-phone/{phone}")
    suspend fun getUserByPhone(@Path("phone") phone: String): RegisterResponse

    @GET("/users/{id}")
    suspend fun getUser(@Path("id") id: String): UserDetailResponse

    @POST("/health")
    suspend fun sendHealth(@Body body: HealthDataRequest): HealthDataResponse

    @POST("/alert")
    suspend fun sendAlert(@Body body: AlertRequest): AlertResponse
}
