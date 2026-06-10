package ru.message2.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

val apiJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
    encodeDefaults = true
}

@Serializable
data class AuthUser(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val role: String? = null
)

@Serializable
data class AuthResponse(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val role: String? = null,
    val accessToken: String,
    val refreshToken: String
) {
    fun toSession(): UserSession = UserSession(
        user = AuthUser(id, username, displayName, avatarUrl, role),
        accessToken = accessToken,
        refreshToken = refreshToken
    )
}

@Serializable
data class RefreshResponse(
    val accessToken: String,
    val refreshToken: String
)

data class UserSession(
    val user: AuthUser,
    val accessToken: String,
    val refreshToken: String
)

@Serializable
data class ChatMember(
    val id: String,
    val displayName: String,
    val username: String,
    val lastReadAt: String? = null
)

@Serializable
data class LastMessage(
    val id: String,
    val senderId: String,
    val cipherText: String,
    val sentAt: String
)

@Serializable
data class ChatDto(
    val id: String,
    val title: String,
    val kind: String,
    val members: List<ChatMember> = emptyList(),
    val peerUserId: String? = null,
    val peerStatus: String? = null,
    val lastDelivery: String? = null,
    val lastMessage: LastMessage? = null
)

@Serializable
data class MessageDto(
    val id: String,
    val chatId: String,
    val senderId: String,
    val cipherText: String,
    val sentAt: String,
    val kind: String? = null,
    val senderDisplayName: String? = null,
    val isTombstone: Boolean? = null,
    val tombstoneLabel: String? = null,
    val isDeleted: Boolean? = null,
    val editedAt: String? = null
)

@Serializable
data class DiscoverUser(
    val id: String,
    val username: String,
    val displayName: String
)

@Serializable
data class DiscoverResponse(
    val users: List<DiscoverUser> = emptyList()
)

@Serializable
data class CreateChatResponse(val id: String)

@Serializable
data class InstanceProfile(
    val deploymentProfile: String? = null,
    val userTransparencyEnabled: Boolean? = null
)

@Serializable
data class WsEnvelope(
    val type: String? = null,
    val payload: MessageDto? = null
)

data class ChatListItem(
    val id: String,
    val title: String,
    val kind: String,
    val peerStatus: String?,
    val lastPreview: String,
    val lastAt: String?
)

data class UiMessage(
    val id: String,
    val isMine: Boolean,
    val author: String,
    val body: String,
    val sentAt: String
)

const val E2EE_CIPHER_PREFIX = "m2e2:v1:"

fun isE2eeCipherText(cipherText: String): Boolean =
    cipherText.startsWith(E2EE_CIPHER_PREFIX)

fun previewCipherText(cipherText: String): String {
    val trimmed = cipherText.trim()
    if (trimmed.isEmpty()) return ""
    if (isE2eeCipherText(trimmed)) return "[E2EE]"
    return try {
        val el = apiJson.parseToJsonElement(trimmed)
        val obj = el as? kotlinx.serialization.json.JsonObject ?: return trimmed
        when (obj["kind"]?.toString()?.trim('"')) {
            "sticker" -> obj["label"]?.toString()?.trim('"')?.ifBlank { "Стикер" } ?: "Стикер"
            "attachment" -> {
                val text = obj["text"]?.toString()?.trim('"').orEmpty()
                val file = obj["fileName"]?.toString()?.trim('"').orEmpty()
                when {
                    text.isNotBlank() -> text
                    file.isNotBlank() -> file
                    else -> "Вложение"
                }
            }
            else -> trimmed
        }
    } catch (_: Exception) {
        trimmed
    }
}
