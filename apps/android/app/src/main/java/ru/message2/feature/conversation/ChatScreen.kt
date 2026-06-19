package ru.message2.feature.conversation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.TextButton
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import ru.message2.data.mock.ChatMessage
import ru.message2.ui.components.ChatAvatar
import ru.message2.ui.components.MessageBubble
import ru.message2.ui.theme.DarkAccent
import ru.message2.ui.theme.DarkAccent2
import ru.message2.ui.theme.DarkBg
import ru.message2.ui.theme.E2eeBadge
import ru.message2.ui.theme.LightAccent
import ru.message2.ui.theme.LightAccent2
import ru.message2.ui.theme.Message2Theme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    chatId: String,
    darkTheme: Boolean,
    title: String,
    statusLine: String,
    isE2ee: Boolean,
    messages: List<ChatMessage>,
    loading: Boolean,
    error: String?,
    sending: Boolean,
    typingPeers: List<String>,
    onReload: () -> Unit,
    onSend: (String) -> Unit,
    onDraftChanged: (String) -> Unit,
    onOpen: () -> Unit,
    onClose: () -> Unit,
    onBack: () -> Unit,
) {
    var draft by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val extra = Message2Theme.extraColors

    DisposableEffect(chatId) {
        onOpen()
        onDispose { onClose() }
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.lastIndex)
        }
    }

    val panelGradient = Brush.verticalGradient(
        colors = if (darkTheme) {
            listOf(Color(0xFF14151C), DarkBg, Color(0xFF101118))
        } else {
            listOf(Color(0xFFF8FBFF), Color(0xFFEEF3FA), Color(0xFFE8EEF8))
        },
    )

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            TopAppBar(
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "Назад")
                    }
                },
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        ChatAvatar(
                            seed = chatId,
                            label = title,
                            size = 40.dp,
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = title,
                                style = MaterialTheme.typography.titleMedium,
                            )
                            Text(
                                text = statusLine,
                                style = MaterialTheme.typography.labelSmall,
                                color = if (statusLine == "в сети") E2eeBadge else extra.muted,
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = extra.chatHeader,
                ),
            )
        },
        bottomBar = {
            Surface(
                tonalElevation = 2.dp,
                color = MaterialTheme.colorScheme.surface,
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .imePadding()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = draft,
                        onValueChange = {
                            draft = it
                            onDraftChanged(it)
                        },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("Сообщение") },
                        shape = RoundedCornerShape(20.dp),
                        maxLines = 4,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = extra.soft,
                            unfocusedContainerColor = extra.soft,
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                        ),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    val sendGradient = Brush.horizontalGradient(
                        colors = if (darkTheme) {
                            listOf(DarkAccent2, DarkAccent)
                        } else {
                            listOf(LightAccent2, LightAccent)
                        },
                    )
                    IconButton(
                        onClick = {
                            if (draft.isBlank()) return@IconButton
                            onSend(draft.trim())
                            draft = ""
                        },
                        modifier = Modifier
                            .size(48.dp)
                            .background(sendGradient, RoundedCornerShape(14.dp)),
                        enabled = !sending,
                    ) {
                        if (sending) {
                            CircularProgressIndicator(
                                color = Color.White,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(20.dp),
                            )
                        } else {
                            Icon(
                                Icons.AutoMirrored.Outlined.Send,
                                contentDescription = "Отправить",
                                tint = Color.White,
                            )
                        }
                    }
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(panelGradient)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            state = listState,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (isE2ee) {
                item {
                    Text(
                        text = "Сообщения защищены E2EE",
                        style = MaterialTheme.typography.labelSmall,
                        color = E2eeBadge,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 4.dp),
                    )
                }
            }
            if (typingPeers.isNotEmpty()) {
                item("typing") {
                    Text(
                        text = "${typingPeers.joinToString()} печатает…",
                        style = MaterialTheme.typography.labelSmall,
                        color = extra.muted,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 2.dp),
                    )
                }
            }
            if (loading) {
                item("loading") {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 10.dp),
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        CircularProgressIndicator()
                    }
                }
            }
            if (error != null) {
                item("error") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = error,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.weight(1f),
                        )
                        TextButton(onClick = onReload) {
                            Text("Повторить")
                        }
                    }
                }
            }
            items(messages, key = { it.id }) { message ->
                MessageBubble(message = message)
            }
        }
    }
}
