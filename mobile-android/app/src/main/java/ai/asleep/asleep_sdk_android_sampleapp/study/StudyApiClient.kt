package ai.asleep.asleep_sdk_android_sampleapp.study

import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException

data class LatestStudy(
    val lectureId: Int,
    val title: String,
    val quizUrl: String?,
    val watchedAt: String,
    val studyGroup: String?,
    val cueId: String?,
    val cueUrl: String?
)

class StudyApiClient(
    private val baseUrl: String,
    private val client: OkHttpClient = OkHttpClient(),
    private val gson: Gson = Gson()
) {
    fun loginAndLoadLatestStudy(
        username: String,
        onSuccess: (LatestStudy) -> Unit,
        onError: (String) -> Unit
    ) {
        val body = gson.toJson(mapOf("username" to username))
            .toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("$baseUrl/api/auth/login")
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError("Unable to reach the study server. Check your connection and try again.")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val responseBody = it.body?.string().orEmpty()
                    if (!it.isSuccessful) {
                        onError(errorMessage(responseBody, "Unable to sign in."))
                        return
                    }

                    try {
                        val userId = gson.fromJson(responseBody, JsonObject::class.java)
                            .getAsJsonObject("user")
                            .get("id")
                            .asInt
                        loadLatestStudy(userId, onSuccess, onError)
                    } catch (_: Exception) {
                        onError("The study server returned an invalid login response.")
                    }
                }
            }
        })
    }

    private fun loadLatestStudy(
        userId: Int,
        onSuccess: (LatestStudy) -> Unit,
        onError: (String) -> Unit
    ) {
        val request = Request.Builder()
            .url("$baseUrl/api/users/$userId/latest-study")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError("Unable to reach the study server. Check your connection and try again.")
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val responseBody = it.body?.string().orEmpty()
                    if (!it.isSuccessful) {
                        onError(errorMessage(responseBody, "Unable to load the latest watched lecture."))
                        return
                    }

                    try {
                        onSuccess(gson.fromJson(responseBody, LatestStudy::class.java))
                    } catch (_: Exception) {
                        onError("The study server returned invalid lecture information.")
                    }
                }
            }
        })
    }

    private fun errorMessage(responseBody: String, fallback: String): String = try {
        gson.fromJson(responseBody, JsonObject::class.java)
            .get("message")
            ?.asString
            ?.takeIf { it.isNotBlank() }
            ?: fallback
    } catch (_: Exception) {
        fallback
    }

    private companion object {
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}
