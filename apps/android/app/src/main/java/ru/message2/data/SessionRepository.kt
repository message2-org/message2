package ru.message2.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import ru.message2.BuildConfig

class SessionRepository(
    private val api: MessagingApi,
    private val store: SessionStore
) {
    suspend fun readCachedSession(): UserSession? = store.sessionFlow.first()

    suspend fun restoreSession(): RestoreResult = withContext(Dispatchers.IO) {
        val cached = readCachedSession() ?: return@withContext RestoreResult.None
        try {
            val user = api.me(cached.accessToken)
            val session = cached.copy(user = user)
            store.save(session)
            RestoreResult.Restored(session)
        } catch (_: UnauthorizedException) {
            try {
                val refreshed = api.refresh(cached.refreshToken)
                val user = api.me(refreshed.accessToken)
                val session = UserSession(user, refreshed.accessToken, refreshed.refreshToken)
                store.save(session)
                RestoreResult.Restored(session)
            } catch (_: UnauthorizedException) {
                store.clear()
                RestoreResult.Cleared
            } catch (network: Exception) {
                RestoreResult.Restored(cached, fromCache = true)
            }
        } catch (_: Exception) {
            RestoreResult.Restored(cached, fromCache = true)
        }
    }

    suspend fun login(username: String, password: String): UserSession = withContext(Dispatchers.IO) {
        val response = api.login(username.trim().lowercase(), password.trim())
        val session = response.toSession()
        store.save(session)
        session
    }

    suspend fun register(displayName: String, username: String, password: String): UserSession =
        withContext(Dispatchers.IO) {
            val response = api.register(
                displayName.trim(),
                username.trim().lowercase(),
                password.trim()
            )
            val session = response.toSession()
            store.save(session)
            session
        }

    suspend fun logout() {
        store.clear()
    }

    suspend fun <T> withAuth(
        session: UserSession,
        onSession: (UserSession) -> Unit,
        block: suspend (String) -> T
    ): T = withContext(Dispatchers.IO) {
        try {
            block(session.accessToken)
        } catch (_: UnauthorizedException) {
            val refreshed = api.refresh(session.refreshToken)
            val user = api.me(refreshed.accessToken)
            val next = UserSession(user, refreshed.accessToken, refreshed.refreshToken)
            store.save(next)
            onSession(next)
            block(next.accessToken)
        }
    }

    companion object {
        fun defaultApi(): MessagingApi {
            val bases = listOf(
                BuildConfig.API_BASE_URL,
                BuildConfig.API_FALLBACK_URL
            ).map { it.trim().trimEnd('/') }.distinct()
            return MessagingApi(bases)
        }
    }
}

sealed class RestoreResult {
    data object None : RestoreResult()
    data object Cleared : RestoreResult()
    data class Restored(val session: UserSession, val fromCache: Boolean = false) : RestoreResult()
}
