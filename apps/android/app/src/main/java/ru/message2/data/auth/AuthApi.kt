package ru.message2.data.auth

import org.json.JSONArray
import org.json.JSONObject
import ru.message2.data.mock.ChatMessage
import ru.message2.data.mock.ChatPreview
import java.io.BufferedReader
import java.io.IOException
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

class AuthApi {
    suspend fun login(username: String, password: String): AuthSession =
        requestAuth(AuthMode.Login, username, password, null)

    suspend fun register(displayName: String, username: String, password: String): AuthSession =
        requestAuth(AuthMode.Register, username, password, displayName)

    suspend fun fetchMe(accessToken: String): AuthUser {
        var networkError: IOException? = null
        for (base in BASE_URLS) {
            try {
                val response = request(
                    method = "GET",
                    url = "$base/auth/me",
                    token = accessToken,
                )
                if (response.code == 401) throw AuthApiException("Сессия истекла")
                if (response.code !in 200..299) {
                    if (response.code >= 500) continue
                    throw AuthApiException(response.errorMessage())
                }
                val body = response.json ?: throw AuthApiException("Пустой профиль")
                return AuthUser(
                    id = body.optString("id"),
                    username = body.optString("username"),
                    displayName = body.optString("displayName").ifBlank { body.optString("username") },
                )
            } catch (ex: IOException) {
                networkError = ex
            }
        }
        throw AuthApiException("Нет соединения с messaging API", networkError)
    }

    suspend fun fetchChats(accessToken: String, me: AuthUser): List<ChatPreview> {
        var networkError: IOException? = null
        for (base in BASE_URLS) {
            try {
                val response = request(
                    method = "GET",
                    url = "$base/chats",
                    token = accessToken,
                )
                if (response.code == 401) throw AuthApiException("Сессия истекла")
                if (response.code !in 200..299) {
                    if (response.code >= 500) continue
                    throw AuthApiException(response.errorMessage())
                }
                val json = response.rawBody.ifBlank { "[]" }
                val chatsArray = JSONArray(json)
                val mapped = mutableListOf<ChatPreview>()
                for (i in 0 until chatsArray.length()) {
                    val chat = chatsArray.optJSONObject(i) ?: continue
                    mapped += chatToPreview(chat, me)
                }
                return mapped
            } catch (ex: IOException) {
                networkError = ex
            }
        }
        throw AuthApiException("Не удалось загрузить список чатов", networkError)
    }

    suspend fun refresh(refreshToken: String): Pair<String, String> {
        var networkError: IOException? = null
        for (base in BASE_URLS) {
            try {
                val payload = JSONObject().put("refreshToken", refreshToken)
                val response = request(
                    method = "POST",
                    url = "$base/auth/refresh",
                    body = payload.toString(),
                )
                if (response.code == 401 || response.code == 403) {
                    throw AuthApiException("Сессия истекла")
                }
                if (response.code !in 200..299) {
                    if (response.code >= 500) continue
                    throw AuthApiException(response.errorMessage())
                }
                val body = response.json ?: throw AuthApiException("Пустой ответ refresh")
                val accessToken = body.optString("accessToken")
                val newRefreshToken = body.optString("refreshToken")
                if (accessToken.isBlank() || newRefreshToken.isBlank()) {
                    throw AuthApiException("Некорректный ответ refresh")
                }
                return accessToken to newRefreshToken
            } catch (ex: IOException) {
                networkError = ex
            }
        }
        throw AuthApiException("Не удалось обновить сессию", networkError)
    }

    suspend fun fetchMessages(accessToken: String, chatId: String, me: AuthUser): List<ChatMessage> {
        var networkError: IOException? = null
        for (base in BASE_URLS) {
            try {
                val response = request(
                    method = "GET",
                    url = "$base/chats/$chatId/messages",
                    token = accessToken,
                )
                if (response.code == 401) throw AuthApiException("Сессия истекла")
                if (response.code !in 200..299) {
                    if (response.code >= 500) continue
                    throw AuthApiException(response.errorMessage())
                }
                val messagesArray = JSONArray(response.rawBody.ifBlank { "[]" })
                val result = mutableListOf<ChatMessage>()
                for (i in 0 until messagesArray.length()) {
                    val item = messagesArray.optJSONObject(i) ?: continue
                    result += messageFromJson(item, me)
                }
                return result
            } catch (ex: IOException) {
                networkError = ex
            }
        }
        throw AuthApiException("Не удалось загрузить сообщения", networkError)
    }

    suspend fun sendMessage(accessToken: String, chatId: String, text: String, me: AuthUser): ChatMessage {
        var networkError: IOException? = null
        for (base in BASE_URLS) {
            try {
                val payload = JSONObject()
                    .put("cipherText", text)
                    .put("kind", "text")
                val response = request(
                    method = "POST",
                    url = "$base/chats/$chatId/messages",
                    token = accessToken,
                    body = payload.toString(),
                )
                if (response.code == 401) throw AuthApiException("Сессия истекла")
                if (response.code !in 200..299) {
                    if (response.code >= 500) continue
                    throw AuthApiException(response.errorMessage())
                }
                val body = response.json ?: throw AuthApiException("Пустой ответ отправки")
                return messageFromJson(body, me)
            } catch (ex: IOException) {
                networkError = ex
            }
        }
        throw AuthApiException("Не удалось отправить сообщение", networkError)
    }

    suspend fun sendTyping(accessToken: String, chatId: String, typing: Boolean) {
        var networkError: IOException? = null
        for (base in BASE_URLS) {
            try {
                val payload = JSONObject().put("typing", typing)
                val response = request(
                    method = "POST",
                    url = "$base/chats/$chatId/typing",
                    token = accessToken,
                    body = payload.toString(),
                )
                if (response.code == 401) throw AuthApiException("Сессия истекла")
                if (response.code in 200..299) return
                if (response.code >= 500) continue
                throw AuthApiException(response.errorMessage())
            } catch (ex: IOException) {
                networkError = ex
            }
        }
        throw AuthApiException("Не удалось отправить typing", networkError)
    }

    private suspend fun requestAuth(
        mode: AuthMode,
        username: String,
        password: String,
        displayName: String?,
    ): AuthSession {
        val endpoint = if (mode == AuthMode.Login) "/auth/login" else "/auth/register"
        var networkError: IOException? = null
        for (base in BASE_URLS) {
            try {
                val payload = JSONObject()
                    .put("username", username)
                    .put("password", password)
                if (mode == AuthMode.Register) {
                    payload.put("displayName", displayName.orEmpty())
                }

                val response = request(
                    method = "POST",
                    url = "$base$endpoint",
                    body = payload.toString(),
                )

                if (response.code !in 200..299) {
                    if (response.code >= 500) continue
                    throw AuthApiException(response.errorMessage())
                }

                val body = response.json ?: throw AuthApiException("Пустой ответ сервера")
                val accessToken = body.optString("accessToken")
                val refreshToken = body.optString("refreshToken")
                val user = AuthUser(
                    id = body.optString("id"),
                    username = body.optString("username"),
                    displayName = body.optString("displayName").ifBlank { body.optString("username") },
                )
                if (user.id.isBlank() || user.username.isBlank() || accessToken.isBlank() || refreshToken.isBlank()) {
                    throw AuthApiException("Некорректный ответ авторизации")
                }
                return AuthSession(
                    user = user,
                    accessToken = accessToken,
                    refreshToken = refreshToken,
                )
            } catch (ex: IOException) {
                networkError = ex
            }
        }
        throw AuthApiException("Нет соединения с messaging API", networkError)
    }

    private fun chatToPreview(chat: JSONObject, me: AuthUser): ChatPreview {
        val chatId = chat.optString("id")
        val title = chat.optString("title").ifBlank { "Чат" }
        val members = chat.optJSONArray("members") ?: JSONArray()
        val peer = findPeerMember(members, me.id)
        val peerStatus = chat.optString("peerStatus")
        val lastMessage = chat.optJSONObject("lastMessage")
        val subtitle = when {
            lastMessage == null -> "Начните переписку"
            else -> {
                val senderId = lastMessage.optString("senderId")
                val text = lastMessage.optString("cipherText").ifBlank { "Сообщение" }
                if (senderId == me.id) "Вы: $text" else text
            }
        }
        val sentAt = lastMessage?.optString("sentAt").orEmpty()
        return ChatPreview(
            id = chatId,
            title = title,
            subtitle = subtitle,
            timeLabel = toTimeLabel(sentAt),
            unreadCount = 0,
            isOnline = peerStatus == "online",
            isE2ee = false,
            seed = peer?.optString("username").orEmpty().ifBlank { chatId },
        )
    }

    private fun findPeerMember(members: JSONArray, meId: String): JSONObject? {
        for (i in 0 until members.length()) {
            val member = members.optJSONObject(i) ?: continue
            if (member.optString("id") != meId) return member
        }
        return null
    }

    private fun messageFromJson(item: JSONObject, me: AuthUser): ChatMessage {
        val senderId = item.optString("senderId")
        val senderDisplayName = item.optString("senderDisplayName").ifBlank {
            if (senderId == me.id) me.displayName else "Собеседник"
        }
        return ChatMessage(
            id = item.optString("id").ifBlank { "msg-${System.nanoTime()}" },
            text = item.optString("cipherText").ifBlank { "Сообщение" },
            isMine = senderId == me.id,
            timeLabel = toTimeLabel(item.optString("sentAt")),
            senderName = if (senderId == me.id) null else senderDisplayName,
        )
    }

    private fun request(
        method: String,
        url: String,
        body: String? = null,
        token: String? = null,
    ): RawResponse {
        val connection = URL(url).openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 3500
        connection.readTimeout = 3500
        connection.setRequestProperty("Content-Type", "application/json")
        connection.setRequestProperty("Accept", "application/json")
        if (!token.isNullOrBlank()) {
            connection.setRequestProperty("Authorization", "Bearer $token")
        }
        if (body != null) {
            connection.doOutput = true
            connection.outputStream.use { output ->
                output.write(body.toByteArray())
            }
        }

        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val raw = if (stream != null) {
            BufferedReader(InputStreamReader(stream)).use { it.readText() }
        } else {
            ""
        }
        return RawResponse(code, raw)
    }

    fun toTimeLabelPublic(isoTime: String): String = toTimeLabel(isoTime)

    private fun toTimeLabel(isoTime: String): String {
        if (isoTime.isBlank()) return ""
        return try {
            OffsetDateTime.parse(isoTime).format(DateTimeFormatter.ofPattern("HH:mm"))
        } catch (_: Exception) {
            isoTime.take(5)
        }
    }

    private data class RawResponse(
        val code: Int,
        val rawBody: String,
    ) {
        val json: JSONObject?
            get() = runCatching {
                if (rawBody.isBlank()) null else JSONObject(rawBody)
            }.getOrNull()

        fun errorMessage(): String {
            val fromJson = json?.optString("error").orEmpty().trim()
            return if (fromJson.isNotBlank()) fromJson else "HTTP $code"
        }
    }

    companion object {
        val BASE_URLS = listOf(
            "http://10.0.2.2:4000/messaging",
            "http://10.0.2.2:4001",
            "http://localhost:4000/messaging",
            "http://localhost:4001",
        )
    }
}

class AuthApiException(message: String, cause: Throwable? = null) : Exception(message, cause)
