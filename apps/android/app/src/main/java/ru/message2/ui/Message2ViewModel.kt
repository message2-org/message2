package ru.message2.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import ru.message2.data.ApiException
import ru.message2.data.ChatDto
import ru.message2.data.ChatListItem
import ru.message2.data.DiscoverUser
import ru.message2.data.MessageDto
import ru.message2.data.RestoreResult
import ru.message2.data.SessionRepository
import ru.message2.data.SessionStore
import ru.message2.data.UiMessage
import ru.message2.data.UserSession
import ru.message2.data.isE2eeCipherText
import ru.message2.data.previewCipherText
import ru.message2.realtime.MessagingWebSocket
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

data class Message2UiState(
    val bootstrapping: Boolean = true,
    val session: UserSession? = null,
    val deploymentProfile: String? = null,
    val chats: List<ChatListItem> = emptyList(),
    val messages: List<UiMessage> = emptyList(),
    val activeChatId: String? = null,
    val activeChatTitle: String = "",
    val discoverUsers: List<DiscoverUser> = emptyList(),
    val discoverQuery: String = "",
    val isRealtimeConnected: Boolean = false,
    val isLoadingChats: Boolean = false,
    val isLoadingMessages: Boolean = false,
    val isSending: Boolean = false,
    val authError: String? = null,
    val globalError: String? = null,
    val statusBanner: String? = null
)

class Message2ViewModel(application: Application) : AndroidViewModel(application) {
    private val api = SessionRepository.defaultApi()
    private val repository = SessionRepository(api, SessionStore(application))
    private var webSocket: MessagingWebSocket? = null

    private val _state = MutableStateFlow(Message2UiState())
    val state: StateFlow<Message2UiState> = _state.asStateFlow()

    private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    init {
        viewModelScope.launch {
            when (val result = repository.restoreSession()) {
                is RestoreResult.None, is RestoreResult.Cleared -> {
                    _state.update { it.copy(bootstrapping = false, session = null) }
                }
                is RestoreResult.Restored -> {
                    onSessionReady(result.session, result.fromCache)
                }
            }
        }
    }

    fun login(username: String, password: String) {
        viewModelScope.launch {
            _state.update { it.copy(isSending = true, authError = null) }
            runCatching { repository.login(username, password) }
                .onSuccess { onSessionReady(it) }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            isSending = false,
                            authError = mapAuthError(error)
                        )
                    }
                }
        }
    }

    fun register(displayName: String, username: String, password: String) {
        viewModelScope.launch {
            _state.update { it.copy(isSending = true, authError = null) }
            runCatching { repository.register(displayName, username, password) }
                .onSuccess { onSessionReady(it) }
                .onFailure { error ->
                    _state.update {
                        it.copy(
                            isSending = false,
                            authError = mapAuthError(error)
                        )
                    }
                }
        }
    }

    fun logout() {
        viewModelScope.launch {
            webSocket?.disconnect()
            webSocket = null
            repository.logout()
            _state.value = Message2UiState(bootstrapping = false)
        }
    }

    fun refreshChats() {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            _state.update { it.copy(isLoadingChats = true, globalError = null) }
            runAuthorized(session) { token ->
                val rows = api.chats(token)
                rows.map { mapChat(it, session.user.id) }
            }.onSuccess { chats ->
                _state.update { it.copy(chats = chats, isLoadingChats = false) }
            }.onFailure { error ->
                _state.update {
                    it.copy(isLoadingChats = false, globalError = error.message ?: "Не удалось загрузить чаты")
                }
            }
        }
    }

    fun openChat(chatId: String, title: String) {
        val session = _state.value.session ?: return
        _state.update {
            it.copy(
                activeChatId = chatId,
                activeChatTitle = title,
                messages = emptyList(),
                isLoadingMessages = true
            )
        }
        viewModelScope.launch {
            runAuthorized(session) { token ->
                api.markRead(token, chatId)
                api.messages(token, chatId)
            }.onSuccess { rows ->
                _state.update {
                    it.copy(
                        messages = rows.mapNotNull { dto -> mapMessage(dto, session.user.id) },
                        isLoadingMessages = false
                    )
                }
            }.onFailure { error ->
                _state.update {
                    it.copy(
                        isLoadingMessages = false,
                        globalError = error.message ?: "Не удалось загрузить сообщения"
                    )
                }
            }
        }
    }

    fun closeChat() {
        _state.update { it.copy(activeChatId = null, activeChatTitle = "", messages = emptyList()) }
    }

    fun sendMessage(text: String) {
        val session = _state.value.session ?: return
        val chatId = _state.value.activeChatId ?: return
        val trimmed = text.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            _state.update { it.copy(isSending = true) }
            runAuthorized(session) { token ->
                api.sendMessage(token, chatId, trimmed)
            }.onSuccess { created ->
                appendMessage(created, session.user.id)
                _state.update { it.copy(isSending = false) }
                refreshChats()
            }.onFailure { error ->
                _state.update {
                    it.copy(
                        isSending = false,
                        globalError = error.message ?: "Не удалось отправить сообщение"
                    )
                }
            }
        }
    }

    fun searchDiscover(query: String) {
        val session = _state.value.session ?: return
        _state.update { it.copy(discoverQuery = query) }
        if (query.trim().length < 2) {
            _state.update { it.copy(discoverUsers = emptyList()) }
            return
        }
        viewModelScope.launch {
            runAuthorized(session) { token ->
                api.discover(token, query.trim())
            }.onSuccess { response ->
                _state.update { it.copy(discoverUsers = response.users) }
            }.onFailure {
                _state.update { it.copy(discoverUsers = emptyList()) }
            }
        }
    }

    fun startDm(user: DiscoverUser) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            runAuthorized(session) { token ->
                api.createDm(token, user.id, user.displayName.ifBlank { user.username })
            }.onSuccess { created ->
                refreshChats()
                openChat(created.id, user.displayName.ifBlank { user.username })
            }.onFailure { error ->
                _state.update {
                    it.copy(globalError = error.message ?: "Не удалось создать диалог")
                }
            }
        }
    }

    fun clearErrors() {
        _state.update { it.copy(authError = null, globalError = null) }
    }

    private fun onSessionReady(session: UserSession, fromCache: Boolean = false) {
        _state.update {
            it.copy(
                bootstrapping = false,
                session = session,
                isSending = false,
                statusBanner = if (fromCache) "Офлайн: показана сохранённая сессия" else null
            )
        }
        viewModelScope.launch {
            val profile = api.instanceProfile()
            _state.update {
                it.copy(deploymentProfile = profile?.deploymentProfile)
            }
        }
        connectWebSocket(session)
        refreshChats()
    }

    private fun connectWebSocket(session: UserSession) {
        val url = api.webSocketUrl(session.accessToken) ?: return
        webSocket?.disconnect()
        webSocket = MessagingWebSocket(
            scope = viewModelScope,
            onMessageCreated = { payload ->
                val current = _state.value
                if (isE2eeCipherText(payload.cipherText)) return@MessagingWebSocket
                if (payload.chatId == current.activeChatId) {
                    mapMessage(payload, current.session?.user?.id.orEmpty())?.let { ui ->
                        appendMessage(ui)
                    }
                }
                refreshChats()
            },
            onConnectionChanged = { connected ->
                _state.update { it.copy(isRealtimeConnected = connected) }
            }
        ).also { it.connect(url) }
    }

    private fun appendMessage(dto: MessageDto, myUserId: String) {
        mapMessage(dto, myUserId)?.let { appendMessage(it) }
    }

    private fun appendMessage(message: UiMessage) {
        _state.update { state ->
            if (state.messages.any { it.id == message.id }) return@update state
            state.copy(messages = state.messages + message)
        }
    }

    private suspend fun <T> runAuthorized(
        session: UserSession,
        block: suspend (String) -> T
    ): Result<T> = runCatching {
        repository.withAuth(session, onSession = { next ->
            _state.update { it.copy(session = next) }
            connectWebSocket(next)
        }, block = block)
    }

    private fun mapChat(chat: ChatDto, myUserId: String): ChatListItem {
        val peer = if (chat.kind == "dm") {
            chat.members.firstOrNull { it.id != myUserId }
        } else null
        val title = if (chat.kind == "dm") {
            peer?.displayName?.ifBlank { peer.username } ?: chat.title
        } else {
            chat.title
        }
        val last = chat.lastMessage
        return ChatListItem(
            id = chat.id,
            title = title,
            kind = chat.kind,
            peerStatus = chat.peerStatus,
            lastPreview = last?.cipherText?.let(::previewCipherText).orEmpty(),
            lastAt = last?.sentAt
        )
    }

    private fun mapMessage(message: MessageDto, myUserId: String): UiMessage? {
        if (message.isDeleted == true) return null
        val body = when {
            message.isTombstone == true ->
                message.tombstoneLabel ?: "Сообщение удалено."
            isE2eeCipherText(message.cipherText) -> "[E2EE: расшифровка на Android в разработке]"
            else -> previewCipherText(message.cipherText)
        }
        val isMine = message.senderId == myUserId
        return UiMessage(
            id = message.id,
            isMine = isMine,
            author = if (isMine) "Вы" else (message.senderDisplayName ?: "Собеседник"),
            body = body,
            sentAt = formatTime(message.sentAt)
        )
    }

    private fun formatTime(iso: String): String = try {
        val instant = Instant.parse(iso)
        timeFormatter.format(instant.atZone(ZoneId.systemDefault()))
    } catch (_: Exception) {
        ""
    }

    private fun mapAuthError(error: Throwable): String {
        if (error is ApiException) {
            return when (error.message) {
                "invalid credentials" -> "Неверные учётные данные"
                "username already exists" -> "Такой логин уже занят"
                "username and password are required" -> "Укажите логин и пароль"
                else -> error.message ?: "Ошибка авторизации"
            }
        }
        return error.message ?: "Сеть недоступна. Запустите pnpm dev:full на ПК."
    }

    override fun onCleared() {
        webSocket?.disconnect()
        super.onCleared()
    }
}
