package ru.message2.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ru.message2.ui.auth.AuthScreen
import ru.message2.ui.chat.ChatScreen
import ru.message2.ui.chats.ChatsScreen
import ru.message2.ui.discover.DiscoverScreen

private object Routes {
    const val Auth = "auth"
    const val Chats = "chats"
    const val Chat = "chat"
    const val Discover = "discover"
}

@Composable
fun Message2App(viewModel: Message2ViewModel = viewModel()) {
    val state by viewModel.state.collectAsState()
    val navController = rememberNavController()
    val snackbar = remember { SnackbarHostState() }

    LaunchedEffect(state.session?.user?.id) {
        val target = if (state.session != null) Routes.Chats else Routes.Auth
        val current = navController.currentDestination?.route
        if (current != target) {
            navController.navigate(target) {
                popUpTo(0) { inclusive = true }
                launchSingleTop = true
            }
        }
    }

    LaunchedEffect(state.globalError) {
        val message = state.globalError ?: return@LaunchedEffect
        snackbar.showSnackbar(message)
        viewModel.clearErrors()
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        if (state.bootstrapping) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        NavHost(
            navController = navController,
            startDestination = if (state.session != null) Routes.Chats else Routes.Auth,
            modifier = Modifier.padding(padding)
        ) {
            composable(Routes.Auth) {
                AuthScreen(
                    loading = state.isSending,
                    error = state.authError,
                    onLogin = viewModel::login,
                    onRegister = viewModel::register
                )
            }
            composable(Routes.Chats) {
                val session = state.session ?: return@composable
                if (state.activeChatId != null) {
                    ChatScreen(
                        title = state.activeChatTitle,
                        messages = state.messages,
                        loading = state.isLoadingMessages,
                        sending = state.isSending,
                        onBack = viewModel::closeChat,
                        onSend = viewModel::sendMessage
                    )
                } else {
                    ChatsScreen(
                        session = session,
                        deploymentProfile = state.deploymentProfile,
                        chats = state.chats,
                        loading = state.isLoadingChats,
                        realtimeConnected = state.isRealtimeConnected,
                        statusBanner = state.statusBanner,
                        onRefresh = viewModel::refreshChats,
                        onLogout = viewModel::logout,
                        onOpenDiscover = { navController.navigate(Routes.Discover) },
                        onOpenChat = viewModel::openChat
                    )
                }
            }
            composable(Routes.Discover) {
                DiscoverScreen(
                    query = state.discoverQuery,
                    users = state.discoverUsers,
                    onBack = { navController.popBackStack() },
                    onQueryChange = viewModel::searchDiscover,
                    onSelectUser = { user ->
                        viewModel.startDm(user)
                        navController.popBackStack()
                    }
                )
            }
        }
    }
}
