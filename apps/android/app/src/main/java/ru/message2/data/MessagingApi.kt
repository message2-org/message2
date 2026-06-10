package ru.message2.data

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiException(val code: Int, message: String) : IOException(message)

class UnauthorizedException : IOException("UNAUTHORIZED")

class MessagingApi(
    private val baseUrls: List<String>,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .build()
) {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    suspend fun login(username: String, password: String): AuthResponse =
        postAuth("/auth/login", buildJsonObject {
            put("username", username)
            put("password", password)
        })

    suspend fun register(displayName: String, username: String, password: String): AuthResponse =
        postAuth("/auth/register", buildJsonObject {
            put("displayName", displayName)
            put("username", username)
            put("password", password)
        })

    suspend fun refresh(refreshToken: String): RefreshResponse {
        val body = buildJsonObject { put("refreshToken", refreshToken) }.toString()
        return withBaseUrls { base ->
            val request = Request.Builder()
                .url("$base/auth/refresh")
                .post(body.toRequestBody(jsonMedia))
                .header("Content-Type", "application/json")
                .build()
            execute(request) { text ->
                if (text.isBlank()) throw ApiException(401, "empty refresh")
                apiJson.decodeFromString<RefreshResponse>(text)
            }
        }
    }

    suspend fun me(accessToken: String): AuthUser =
        authorizedGet("/auth/me", accessToken) { text ->
            apiJson.decodeFromString<AuthUser>(text).let { user ->
                val name = user.displayName.trim()
                if (user.id.isBlank() || user.username.isBlank() || name.isEmpty()) {
                    throw ApiException(400, "invalid profile")
                }
                user.copy(displayName = name)
            }
        }

    suspend fun instanceProfile(): InstanceProfile? = try {
        withBaseUrls { base ->
            val request = Request.Builder().url("$base/instance/profile").get().build()
            execute(request) { text ->
                if (text.isBlank()) InstanceProfile()
                else apiJson.decodeFromString<InstanceProfile>(text)
            }
        }
    } catch (_: Exception) {
        null
    }

    suspend fun chats(accessToken: String): List<ChatDto> =
        authorizedGet("/chats", accessToken) { text ->
            apiJson.decodeFromString<List<ChatDto>>(text)
        }

    suspend fun messages(accessToken: String, chatId: String): List<MessageDto> =
        authorizedGet("/chats/$chatId/messages", accessToken) { text ->
            apiJson.decodeFromString<List<MessageDto>>(text)
        }

    suspend fun sendMessage(accessToken: String, chatId: String, text: String): MessageDto {
        val body = buildJsonObject {
            put("cipherText", text)
            put("kind", "text")
        }.toString()
        return authorizedWrite("POST", "/chats/$chatId/messages", accessToken, body) { responseText ->
            apiJson.decodeFromString<MessageDto>(responseText)
        }
    }

    suspend fun markRead(accessToken: String, chatId: String) {
        authorizedWrite("POST", "/chats/$chatId/read", accessToken, "{}") { }
    }

    suspend fun discover(accessToken: String, query: String): DiscoverResponse =
        authorizedGet("/discover?query=${java.net.URLEncoder.encode(query, Charsets.UTF_8)}", accessToken) { text ->
            apiJson.decodeFromString<DiscoverResponse>(text)
        }

    suspend fun createDm(accessToken: String, peerUserId: String, title: String): CreateChatResponse {
        val payload = buildJsonObject {
            put("title", title)
            put(
                "members",
                kotlinx.serialization.json.JsonArray(
                    listOf(kotlinx.serialization.json.JsonPrimitive(peerUserId))
                )
            )
        }.toString()
        return authorizedWrite("POST", "/chats", accessToken, payload) { text ->
            apiJson.decodeFromString<CreateChatResponse>(text)
        }
    }

    fun webSocketUrl(accessToken: String): String? {
        for (base in baseUrls) {
            val wsBase = when {
                base.startsWith("https://") -> base.replaceFirst("https://", "wss://")
                base.startsWith("http://") -> base.replaceFirst("http://", "ws://")
                else -> continue
            }
            return "$wsBase/ws?token=${java.net.URLEncoder.encode(accessToken, Charsets.UTF_8)}"
        }
        return null
    }

    private suspend fun postAuth(path: String, body: JsonObject): AuthResponse {
        val raw = body.toString()
        return withBaseUrls { base ->
            val request = Request.Builder()
                .url("$base$path")
                .post(raw.toRequestBody(jsonMedia))
                .header("Content-Type", "application/json")
                .header("Accept-Language", "ru-RU,ru;q=0.9")
                .build()
            execute(request) { text ->
                val response = apiJson.decodeFromString<AuthResponse>(text)
                if (response.accessToken.isBlank() || response.refreshToken.isBlank()) {
                    throw ApiException(400, "invalid auth payload")
                }
                response
            }
        }
    }

    private suspend fun <T> authorizedGet(path: String, accessToken: String, parse: (String) -> T): T =
        authorizedWrite("GET", path, accessToken, null, parse)

    private suspend fun <T> authorizedWrite(
        method: String,
        path: String,
        accessToken: String,
        body: String?,
        parse: (String) -> T
    ): T = withBaseUrls { base ->
        val builder = Request.Builder()
            .url("$base$path")
            .header("Authorization", "Bearer $accessToken")
        when (method) {
            "GET" -> builder.get()
            "POST" -> builder.post((body ?: "{}").toRequestBody(jsonMedia))
            "PATCH" -> builder.patch((body ?: "{}").toRequestBody(jsonMedia))
            "DELETE" -> builder.delete()
            else -> error("unsupported method")
        }
        execute(builder.build(), parse)
    }

    private suspend fun <T> withBaseUrls(block: suspend (String) -> T): T {
        var lastNetwork: IOException? = null
        for (base in baseUrls) {
            try {
                return block(base.trimEnd('/'))
            } catch (error: UnauthorizedException) {
                throw error
            } catch (error: ApiException) {
                if (error.code >= 500) continue
                throw error
            } catch (error: IOException) {
                lastNetwork = error
            }
        }
        throw lastNetwork ?: IOException("request failed")
    }

    private fun <T> execute(request: Request, parse: (String) -> T): T {
        client.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            if (response.code == 401) throw UnauthorizedException()
            if (!response.isSuccessful) {
                val message = try {
                    apiJson.parseToJsonElement(text)
                        .let { it as? JsonObject }
                        ?.get("error")
                        ?.toString()
                        ?.trim('"')
                } catch (_: Exception) {
                    null
                }
                throw ApiException(response.code, message ?: "HTTP ${response.code}")
            }
            return parse(text)
        }
    }

}
