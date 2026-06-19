package ru.message2.data.mock

data class ChatPreview(
    val id: String,
    val title: String,
    val subtitle: String,
    val timeLabel: String,
    val unreadCount: Int = 0,
    val isOnline: Boolean = false,
    val isE2ee: Boolean = false,
    val seed: String,
)

data class ChatMessage(
    val id: String,
    val text: String,
    val isMine: Boolean,
    val timeLabel: String,
    val senderName: String? = null,
)

data class ChatDetail(
    val preview: ChatPreview,
    val messages: List<ChatMessage>,
    val statusLine: String,
)

object MockData {
    val chats = listOf(
        ChatPreview(
            id = "dm-alice",
            title = "Алиса",
            subtitle = "Договорились на завтра 👍",
            timeLabel = "18:42",
            unreadCount = 2,
            isOnline = true,
            isE2ee = true,
            seed = "alice",
        ),
        ChatPreview(
            id = "dm-bob",
            title = "Борис",
            subtitle = "Отправил файл presentation.pdf",
            timeLabel = "17:05",
            isOnline = false,
            seed = "bob",
        ),
        ChatPreview(
            id = "group-dev",
            title = "Команда разработки",
            subtitle = "Вы: обновил API контракты",
            timeLabel = "16:20",
            unreadCount = 5,
            seed = "team-dev",
        ),
        ChatPreview(
            id = "dm-support",
            title = "Поддержка Послание2",
            subtitle = "Ваш запрос принят в работу",
            timeLabel = "Вчера",
            seed = "support",
        ),
        ChatPreview(
            id = "saved",
            title = "Избранное",
            subtitle = "Заметка: пароль от staging",
            timeLabel = "Пн",
            seed = "saved-messages",
        ),
    )

    private val messagesByChat = mapOf(
        "dm-alice" to listOf(
            ChatMessage("1", "Привет! Как продвигается Android-клиент?", false, "18:30"),
            ChatMessage("2", "Уже делаем UI — будет красиво, как на web", true, "18:35"),
            ChatMessage("3", "Отлично. E2EE в DM включён?", false, "18:38", "Алиса"),
            ChatMessage("4", "Пока mock, но бейдж уже есть 🔒", true, "18:40"),
            ChatMessage("5", "Договорились на завтра 👍", false, "18:42"),
        ),
        "dm-bob" to listOf(
            ChatMessage("1", "Скинь, пожалуйста, презентацию", false, "16:50"),
            ChatMessage("2", "Отправил файл presentation.pdf", true, "17:05"),
        ),
        "group-dev" to listOf(
            ChatMessage("1", "Нужно синхронизировать contracts", false, "15:40", "Мария"),
            ChatMessage("2", "Я уже обновил messaging API", false, "15:55", "Иван"),
            ChatMessage("3", "обновил API контракты", true, "16:20"),
        ),
    )

    fun chatDetail(chatId: String): ChatDetail {
        val preview = chats.firstOrNull { it.id == chatId }
            ?: ChatPreview(
                id = chatId,
                title = "Диалог",
                subtitle = "Серверный чат",
                timeLabel = "",
                seed = chatId,
            )
        val messages = messagesByChat[chatId]
            ?: listOf(
                ChatMessage("1", "Начните переписку", false, "сейчас"),
            )
        val statusLine = when {
            preview.isOnline -> "в сети"
            preview.isE2ee -> "E2EE · был(а) недавно"
            else -> "был(а) недавно"
        }
        return ChatDetail(preview, messages, statusLine)
    }
}
