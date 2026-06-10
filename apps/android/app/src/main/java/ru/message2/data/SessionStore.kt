package ru.message2.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.sessionDataStore: DataStore<Preferences> by preferencesDataStore(name = "message2_session")

class SessionStore(private val context: Context) {
    private val userIdKey = stringPreferencesKey("user_id")
    private val usernameKey = stringPreferencesKey("username")
    private val displayNameKey = stringPreferencesKey("display_name")
    private val avatarUrlKey = stringPreferencesKey("avatar_url")
    private val roleKey = stringPreferencesKey("role")
    private val accessTokenKey = stringPreferencesKey("access_token")
    private val refreshTokenKey = stringPreferencesKey("refresh_token")

    val sessionFlow: Flow<UserSession?> = context.sessionDataStore.data.map { prefs ->
        val access = prefs[accessTokenKey] ?: return@map null
        val refresh = prefs[refreshTokenKey] ?: return@map null
        val id = prefs[userIdKey] ?: return@map null
        val username = prefs[usernameKey] ?: return@map null
        val displayName = prefs[displayNameKey]?.trim().orEmpty()
        if (displayName.isEmpty()) return@map null
        UserSession(
            user = AuthUser(
                id = id,
                username = username,
                displayName = displayName,
                avatarUrl = prefs[avatarUrlKey],
                role = prefs[roleKey]
            ),
            accessToken = access,
            refreshToken = refresh
        )
    }

    suspend fun save(session: UserSession) {
        context.sessionDataStore.edit { prefs ->
            prefs[userIdKey] = session.user.id
            prefs[usernameKey] = session.user.username
            prefs[displayNameKey] = session.user.displayName
            prefs[avatarUrlKey] = session.user.avatarUrl.orEmpty()
            prefs[roleKey] = session.user.role.orEmpty()
            prefs[accessTokenKey] = session.accessToken
            prefs[refreshTokenKey] = session.refreshToken
        }
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.clear() }
    }
}
