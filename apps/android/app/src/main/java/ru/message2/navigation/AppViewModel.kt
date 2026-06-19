package ru.message2.navigation

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import ru.message2.data.auth.AuthApi
import ru.message2.data.auth.AuthApiException
import ru.message2.data.auth.AuthMode
import ru.message2.data.auth.AuthSession
import ru.message2.data.auth.SessionStore
import ru.message2.data.mock.ChatMessage
import ru.message2.data.mock.ChatPreview
import ru.message2.data.mock.MockData
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

data class AppUiState(
    val checkingSession: Boolean = true,
    val authSubmitting: Boolean = false,
    val session: AuthSession? = null,
    val authError: String? = null,
    val chatsLoading: Boolean = false,
    val chats: List<ChatPreview> = emptyList(),
    val chatsError: String? = null,
    val activeChatId: String? = null,
    val messagesByChat: Map<String, List<ChatMessage>> = emptyMap(),
    val messageLoadingByChat: Map<String, Boolean> = emptyMap(),
    val messageErrorByChat: Map<String, String?> = emptyMap(),
    val messageSendingByChat: Map<String, Boolean> = emptyMap(),
    val typingByChat: Map<String, List<String>> = emptyMap(),
    val realtimeConnected: Boolean = false,
)

class AppViewModel(application: Application) : AndroidViewModel(application) {
    private val api = AuthApi()
    private val httpClient = OkHttpClient()
    private val sessionStore = SessionStore(application)
    private val _state = MutableStateFlow(AppUiState())
    val state: StateFlow<AppUiState> = _state.asStateFlow()
    private var chatPollingJob: Job? = null
    private var ws: WebSocket? = null
    private var wsReconnectJob: Job? = null
    private var typingStopJobs: MutableMap<String, Job> = mutableMapOf()
    private var lastPresenceRefreshAtMs: Long = 0L

    init {
        restoreSession()
    }

    fun submitAuth(
        mode: AuthMode,
        username: String,
        password: String,
        displayName: String,
    ) {
        viewModelScope.launch {
            _state.value = _state.value.copy(authSubmitting = true, authError = null)
            try {
                val session = withContext(Dispatchers.IO) {
                    if (mode == AuthMode.Login) {
                        api.login(username.trim(), password)
                    } else {
                        api.register(displayName.trim(), username.trim(), password)
                    }
                }
                sessionStore.save(session)
                _state.value = _state.value.copy(
                    session = session,
                    authSubmitting = false,
                    authError = null,
                    checkingSession = false,
                )
                connectRealtime(session)
                refreshChats()
            } catch (ex: AuthApiException) {
                _state.value = _state.value.copy(
                    authSubmitting = false,
                    authError = ex.message ?: "Ошибка авторизации",
                )
            }
        }
    }

    fun logout() {
        chatPollingJob?.cancel()
        wsReconnectJob?.cancel()
        ws?.close(1000, "logout")
        ws = null
        sessionStore.clear()
        _state.value = AppUiState(checkingSession = false)
    }

    fun refreshChats() {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(chatsLoading = true, chatsError = null)
            try {
                val chats = withContext(Dispatchers.IO) {
                    api.fetchChats(session.accessToken, session.user)
                }
                _state.value = _state.value.copy(
                    chatsLoading = false,
                    chats = chats.ifEmpty { MockData.chats },
                    chatsError = null,
                )
            } catch (ex: AuthApiException) {
                if ((ex.message ?: "").contains("Сессия истекла")) {
                    val refreshed = refreshSessionOrNull(session)
                    if (refreshed != null) {
                        refreshChats()
                    } else {
                        logout()
                    }
                    return@launch
                }
                _state.value = _state.value.copy(
                    chatsLoading = false,
                    chats = MockData.chats,
                    chatsError = "${ex.message ?: "Не удалось загрузить чаты"} · показаны mock-данные",
                )
            }
        }
    }

    private fun restoreSession() {
        viewModelScope.launch {
            val stored = sessionStore.read()
            if (stored == null) {
                _state.value = AppUiState(checkingSession = false)
                return@launch
            }
            _state.value = _state.value.copy(session = stored, checkingSession = false)
            connectRealtime(stored)
            refreshChats()
        }
    }

    fun openChat(chatId: String) {
        _state.value = _state.value.copy(
            activeChatId = chatId,
            chats = _state.value.chats.map { chat ->
                if (chat.id == chatId) chat.copy(unreadCount = 0) else chat
            },
        )
        loadMessages(chatId, silent = false)
        if (!_state.value.realtimeConnected) {
            startChatPolling(chatId)
        }
    }

    fun closeChat(chatId: String) {
        if (_state.value.activeChatId == chatId) {
            _state.value = _state.value.copy(activeChatId = null)
        }
        chatPollingJob?.cancel()
        _state.value = _state.value.copy(
            typingByChat = _state.value.typingByChat + (chatId to emptyList()),
        )
        typingStopJobs.remove(chatId)?.cancel()
        notifyTyping(chatId, false)
    }

    fun sendMessage(chatId: String, text: String) {
        val trimmed = text.trim()
        if (trimmed.isBlank()) return
        val session = _state.value.session ?: return
        viewModelScope.launch {
            markSending(chatId, true)
            try {
                val sent = withContext(Dispatchers.IO) {
                    api.sendMessage(session.accessToken, chatId, trimmed, session.user)
                }
                val current = _state.value.messagesByChat[chatId].orEmpty()
                val merged = current + sent
                _state.value = _state.value.copy(
                    messagesByChat = _state.value.messagesByChat + (chatId to merged),
                    messageErrorByChat = _state.value.messageErrorByChat + (chatId to null),
                )
                updateChatPreviewFromMessage(chatId, sent)
            } catch (ex: AuthApiException) {
                if ((ex.message ?: "").contains("Сессия истекла")) {
                    val refreshed = refreshSessionOrNull(session)
                    if (refreshed != null) {
                        sendMessage(chatId, trimmed)
                        return@launch
                    }
                    logout()
                    return@launch
                }
                _state.value = _state.value.copy(
                    messageErrorByChat = _state.value.messageErrorByChat + (chatId to (ex.message ?: "Ошибка отправки")),
                )
            } finally {
                markSending(chatId, false)
            }
        }
    }

    fun onDraftChanged(chatId: String, draft: String) {
        if (_state.value.activeChatId != chatId) return
        if (!_state.value.realtimeConnected) return
        val hasText = draft.isNotBlank()
        if (hasText) {
            notifyTyping(chatId, true)
        }
        typingStopJobs.remove(chatId)?.cancel()
        if (!hasText) {
            notifyTyping(chatId, false)
            return
        }
        typingStopJobs[chatId] = viewModelScope.launch {
            delay(1200)
            notifyTyping(chatId, false)
        }
    }

    fun loadMessages(chatId: String, silent: Boolean) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            if (!silent) {
                _state.value = _state.value.copy(
                    messageLoadingByChat = _state.value.messageLoadingByChat + (chatId to true),
                    messageErrorByChat = _state.value.messageErrorByChat + (chatId to null),
                )
            }
            try {
                val messages = withContext(Dispatchers.IO) {
                    api.fetchMessages(session.accessToken, chatId, session.user)
                }
                _state.value = _state.value.copy(
                    messagesByChat = _state.value.messagesByChat + (chatId to messages),
                    messageLoadingByChat = _state.value.messageLoadingByChat + (chatId to false),
                    messageErrorByChat = _state.value.messageErrorByChat + (chatId to null),
                )
            } catch (ex: AuthApiException) {
                if ((ex.message ?: "").contains("Сессия истекла")) {
                    val refreshed = refreshSessionOrNull(session)
                    if (refreshed != null) {
                        loadMessages(chatId, silent)
                        return@launch
                    }
                    logout()
                    return@launch
                }
                val fallback = _state.value.messagesByChat[chatId]
                    ?: MockData.chatDetail(chatId).messages
                _state.value = _state.value.copy(
                    messagesByChat = _state.value.messagesByChat + (chatId to fallback),
                    messageLoadingByChat = _state.value.messageLoadingByChat + (chatId to false),
                    messageErrorByChat = _state.value.messageErrorByChat + (chatId to (ex.message ?: "Ошибка загрузки сообщений")),
                )
            }
        }
    }

    private fun startChatPolling(chatId: String) {
        chatPollingJob?.cancel()
        chatPollingJob = viewModelScope.launch {
            while (isActive && _state.value.activeChatId == chatId) {
                delay(4000)
                loadMessages(chatId, silent = true)
            }
        }
    }

    private fun markSending(chatId: String, sending: Boolean) {
        _state.value = _state.value.copy(
            messageSendingByChat = _state.value.messageSendingByChat + (chatId to sending),
        )
    }

    private suspend fun refreshSessionOrNull(session: AuthSession): AuthSession? {
        try {
            val refreshed = withContext(Dispatchers.IO) { api.refresh(session.refreshToken) }
            val me = withContext(Dispatchers.IO) { api.fetchMe(refreshed.first) }
            val newSession = AuthSession(
                user = me,
                accessToken = refreshed.first,
                refreshToken = refreshed.second,
            )
            sessionStore.save(newSession)
            _state.value = _state.value.copy(session = newSession)
            connectRealtime(newSession)
            return newSession
        } catch (_: Exception) {
            return null
        }
    }

    private fun connectRealtime(session: AuthSession) {
        wsReconnectJob?.cancel()
        ws?.close(1000, "reconnect")
        ws = null
        val candidates = wsCandidates(session.accessToken)
        if (candidates.isEmpty()) return
        connectRealtimeCandidate(session, candidates, 0)
    }

    private fun connectRealtimeCandidate(session: AuthSession, candidates: List<String>, index: Int) {
        if (index >= candidates.size) {
            scheduleReconnect(session)
            return
        }
        val request = Request.Builder().url(candidates[index]).build()
        ws = httpClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _state.value = _state.value.copy(realtimeConnected = true)
                val active = _state.value.activeChatId
                if (active != null) {
                    chatPollingJob?.cancel()
                }
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleRealtimeMessage(text)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _state.value = _state.value.copy(realtimeConnected = false)
                val active = _state.value.activeChatId
                if (active != null) {
                    startChatPolling(active)
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _state.value = _state.value.copy(realtimeConnected = false)
                connectRealtimeCandidate(session, candidates, index + 1)
            }
        })
    }

    private fun scheduleReconnect(session: AuthSession) {
        wsReconnectJob?.cancel()
        wsReconnectJob = viewModelScope.launch {
            delay(3500)
            connectRealtime(session)
        }
    }

    private fun wsCandidates(accessToken: String): List<String> {
        val encoded = URLEncoder.encode(accessToken, StandardCharsets.UTF_8.toString())
        return AuthApi.BASE_URLS.map { base ->
            base.replaceFirst("http://", "ws://").replaceFirst("https://", "wss://") +
                "/ws?token=$encoded"
        }
    }

    private fun handleRealtimeMessage(raw: String) {
        val root = runCatching { JSONObject(raw) }.getOrNull() ?: return
        val type = root.optString("type")
        val payload = root.optJSONObject("payload") ?: return
        when (type) {
            "message.created" -> handleRealtimeMessageCreated(payload)
            "chat.typing" -> handleRealtimeTyping(payload)
            "presence.changed" -> handleRealtimePresence(payload)
        }
    }

    private fun handleRealtimeMessageCreated(payload: JSONObject) {
        val chatId = payload.optString("chatId")
        if (chatId.isBlank()) return
        val session = _state.value.session ?: return
        val senderId = payload.optString("senderId")
        val message = ChatMessage(
            id = payload.optString("id").ifBlank { "ws-${System.nanoTime()}" },
            text = payload.optString("cipherText").ifBlank { "Сообщение" },
            isMine = senderId == session.user.id,
            timeLabel = api.toTimeLabelPublic(payload.optString("sentAt")),
            senderName = if (senderId == session.user.id) null else payload.optString("senderDisplayName").ifBlank { "Собеседник" },
        )
        viewModelScope.launch {
            val current = _state.value.messagesByChat[chatId].orEmpty()
            if (current.any { it.id == message.id }) return@launch
            _state.value = _state.value.copy(
                messagesByChat = _state.value.messagesByChat + (chatId to (current + message)),
            )
            val activeChat = _state.value.activeChatId
            updateChatPreviewFromMessage(
                chatId = chatId,
                message = message,
                incrementUnread = activeChat != chatId && !message.isMine,
            )
        }
    }

    private fun handleRealtimeTyping(payload: JSONObject) {
        val chatId = payload.optString("chatId")
        val userId = payload.optString("userId")
        if (chatId.isBlank() || userId.isBlank()) return
        val sessionUserId = _state.value.session?.user?.id
        if (sessionUserId == userId) return
        val typing = payload.optBoolean("typing", false)
        val displayName = payload.optString("displayName").ifBlank { "Собеседник" }
        viewModelScope.launch {
            val existing = _state.value.typingByChat[chatId].orEmpty()
            val next = if (!typing) {
                existing.filterNot { it == displayName }
            } else if (existing.contains(displayName)) {
                existing
            } else {
                existing + displayName
            }
            _state.value = _state.value.copy(
                typingByChat = _state.value.typingByChat + (chatId to next),
            )
        }
    }

    private fun handleRealtimePresence(payload: JSONObject) {
        val status = payload.optString("status")
        if (status != "online" && status != "offline") return
        val now = System.currentTimeMillis()
        if (now - lastPresenceRefreshAtMs < 2500) return
        lastPresenceRefreshAtMs = now
        refreshChats()
    }

    private fun notifyTyping(chatId: String, typing: Boolean) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    api.sendTyping(session.accessToken, chatId, typing)
                }
            } catch (_: Exception) {
                // Best effort only; typing should never break chat UX.
            }
        }
    }

    private fun updateChatPreviewFromMessage(chatId: String, message: ChatMessage, incrementUnread: Boolean = false) {
        val formattedText = if (message.isMine) "Вы: ${message.text}" else message.text
        val updated = _state.value.chats.map { chat ->
            if (chat.id != chatId) return@map chat
            chat.copy(
                subtitle = formattedText,
                timeLabel = message.timeLabel,
                unreadCount = if (incrementUnread) chat.unreadCount + 1 else chat.unreadCount,
            )
        }
        _state.value = _state.value.copy(chats = updated)
    }

    override fun onCleared() {
        super.onCleared()
        wsReconnectJob?.cancel()
        chatPollingJob?.cancel()
        typingStopJobs.values.forEach { it.cancel() }
        typingStopJobs.clear()
        ws?.close(1000, "cleared")
        ws = null
        httpClient.dispatcher.executorService.shutdown()
    }
}
