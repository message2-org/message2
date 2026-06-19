package ru.message2.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ru.message2.data.auth.AuthMode
import ru.message2.feature.auth.AuthScreen
import ru.message2.feature.chatlist.ChatListScreen
import ru.message2.feature.conversation.ChatScreen

object Routes {
    const val AUTH = "auth"
    const val CHATS = "chats"
    const val CHAT = "chat/{chatId}"

    fun chat(chatId: String) = "chat/$chatId"
}

@Composable
fun Message2App(
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
) {
    val navController = rememberNavController()
    val vm: AppViewModel = viewModel()
    val state by vm.state.collectAsState()

    if (state.checkingSession) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            CircularProgressIndicator()
            Text("Восстанавливаем сессию…")
        }
        return
    }

    LaunchedEffect(state.session) {
        if (state.session != null && navController.currentDestination?.route == Routes.AUTH) {
            navController.navigate(Routes.CHATS) {
                popUpTo(Routes.AUTH) { inclusive = true }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = if (state.session != null) Routes.CHATS else Routes.AUTH,
    ) {
        composable(Routes.AUTH) {
            AuthScreen(
                darkTheme = darkTheme,
                onToggleTheme = onToggleTheme,
                isSubmitting = state.authSubmitting,
                errorText = state.authError,
                onSubmit = { mode: AuthMode, username: String, password: String, displayName: String ->
                    vm.submitAuth(mode, username, password, displayName)
                },
            )
        }

        composable(Routes.CHATS) {
            ChatListScreen(
                darkTheme = darkTheme,
                chatItems = state.chats,
                loading = state.chatsLoading,
                error = state.chatsError,
                onToggleTheme = onToggleTheme,
                onRefresh = { vm.refreshChats() },
                onLogout = {
                    vm.logout()
                    navController.navigate(Routes.AUTH) {
                        popUpTo(Routes.CHATS) { inclusive = true }
                    }
                },
                onChatClick = { chatId ->
                    vm.openChat(chatId)
                    navController.navigate(Routes.chat(chatId))
                },
            )
        }

        composable(
            route = Routes.CHAT,
            arguments = listOf(navArgument("chatId") { type = NavType.StringType }),
        ) { entry ->
            val chatId = entry.arguments?.getString("chatId").orEmpty()
            val preview = state.chats.firstOrNull { it.id == chatId }
            ChatScreen(
                chatId = chatId,
                darkTheme = darkTheme,
                title = preview?.title ?: "Диалог",
                statusLine = when {
                    preview == null -> "Серверный чат"
                    preview.isOnline -> "в сети"
                    else -> "был(а) недавно"
                },
                isE2ee = preview?.isE2ee == true,
                messages = state.messagesByChat[chatId].orEmpty(),
                loading = state.messageLoadingByChat[chatId] == true,
                error = state.messageErrorByChat[chatId],
                sending = state.messageSendingByChat[chatId] == true,
                typingPeers = state.typingByChat[chatId].orEmpty(),
                onReload = { vm.loadMessages(chatId, silent = false) },
                onSend = { text -> vm.sendMessage(chatId, text) },
                onDraftChanged = { text -> vm.onDraftChanged(chatId, text) },
                onOpen = { vm.openChat(chatId) },
                onClose = { vm.closeChat(chatId) },
                onBack = { navController.popBackStack() },
            )
        }
    }
}
