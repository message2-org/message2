package ru.message2.realtime

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import ru.message2.data.MessageDto
import ru.message2.data.WsEnvelope
import ru.message2.data.apiJson
import java.util.concurrent.TimeUnit

class MessagingWebSocket(
    private val scope: CoroutineScope,
    private val onMessageCreated: (MessageDto) -> Unit,
    private val onConnectionChanged: (Boolean) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .pingInterval(25, TimeUnit.SECONDS)
        .build()

    private var socket: WebSocket? = null
    private var reconnectJob: Job? = null
    private var closed = false
    private var currentUrl: String? = null

    fun connect(url: String) {
        if (currentUrl == url && socket != null) return
        disconnect()
        closed = false
        currentUrl = url
        open(url)
    }

    fun disconnect() {
        closed = true
        reconnectJob?.cancel()
        reconnectJob = null
        socket?.close(1000, "bye")
        socket = null
        onConnectionChanged(false)
    }

    private fun open(url: String) {
        val request = Request.Builder().url(url).build()
        socket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                onConnectionChanged(true)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleFrame(text)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                onConnectionChanged(false)
                scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                onConnectionChanged(false)
                scheduleReconnect()
            }
        })
    }

    private fun scheduleReconnect() {
        if (closed) return
        val url = currentUrl ?: return
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(2_500)
            if (!closed) open(url)
        }
    }

    private fun handleFrame(text: String) {
        val envelope = try {
            apiJson.decodeFromString<WsEnvelope>(text)
        } catch (_: Exception) {
            return
        }
        if (envelope.type != "message.created") return
        val payload = envelope.payload ?: return
        if (payload.chatId.isBlank() || payload.id.isBlank()) return
        onMessageCreated(payload)
    }
}
