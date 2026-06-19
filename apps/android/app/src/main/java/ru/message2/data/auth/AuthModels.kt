package ru.message2.data.auth

data class AuthUser(
    val id: String,
    val username: String,
    val displayName: String,
)

data class AuthSession(
    val user: AuthUser,
    val accessToken: String,
    val refreshToken: String,
)

enum class AuthMode {
    Login,
    Register,
}
