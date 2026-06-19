package ru.message2.feature.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import ru.message2.ui.components.BrandLogo
import ru.message2.ui.components.Message2TextField
import ru.message2.ui.theme.DarkAccent
import ru.message2.ui.theme.DarkAccent2
import ru.message2.ui.theme.DarkBg
import ru.message2.ui.theme.LightAccent
import ru.message2.ui.theme.LightAccent2
import ru.message2.ui.theme.LightBg
import ru.message2.ui.theme.Message2Theme
import ru.message2.data.auth.AuthMode

@Composable
fun AuthScreen(
    darkTheme: Boolean,
    onToggleTheme: () -> Unit,
    isSubmitting: Boolean,
    errorText: String?,
    onSubmit: (mode: AuthMode, username: String, password: String, displayName: String) -> Unit,
) {
    var isRegister by rememberSaveable { mutableStateOf(false) }
    var username by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var displayName by rememberSaveable { mutableStateOf("") }
    var localError by rememberSaveable { mutableStateOf<String?>(null) }

    val bgGradient = if (darkTheme) {
        Brush.verticalGradient(
            colors = listOf(
                Color(0xFF1A1B24),
                DarkBg,
                Color(0xFF151622),
            ),
        )
    } else {
        Brush.verticalGradient(
            colors = listOf(
                Color(0xFFFFFFFF),
                LightBg,
                Color(0xFFE8F0FF),
            ),
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgGradient),
    ) {
        IconButton(
            onClick = onToggleTheme,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(12.dp),
        ) {
            Icon(
                imageVector = if (darkTheme) Icons.Outlined.LightMode else Icons.Outlined.DarkMode,
                contentDescription = "Переключить тему",
                tint = MaterialTheme.colorScheme.onBackground,
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 48.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    BrandLogo(darkTheme = darkTheme)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Послание2",
                        style = MaterialTheme.typography.headlineMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = if (isRegister) "Создайте аккаунт" else "Войдите в аккаунт",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Message2Theme.extraColors.muted,
                        modifier = Modifier.padding(top = 6.dp, bottom = 20.dp),
                    )

                    if (isRegister) {
                        Message2TextField(
                            value = displayName,
                            onValueChange = { displayName = it },
                            label = "Отображаемое имя",
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    Message2TextField(
                        value = username,
                        onValueChange = { username = it },
                        label = "Имя пользователя",
                        isError = localError != null && username.isBlank(),
                        errorText = "Укажите имя пользователя",
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Message2TextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "Пароль",
                        isPassword = true,
                        isError = localError != null && password.isBlank(),
                        errorText = "Укажите пароль",
                    )

                    val actualError = errorText ?: localError
                    if (actualError != null) {
                        Text(
                            text = actualError,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 10.dp),
                            textAlign = TextAlign.Center,
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    val buttonGradient = Brush.horizontalGradient(
                        colors = if (darkTheme) {
                            listOf(DarkAccent2, DarkAccent)
                        } else {
                            listOf(LightAccent2, LightAccent)
                        },
                    )

                    Button(
                        onClick = {
                            if (username.isBlank() || password.isBlank()) {
                                localError = "Заполните все поля"
                                return@Button
                            }
                            localError = null
                            onSubmit(
                                if (isRegister) AuthMode.Register else AuthMode.Login,
                                username,
                                password,
                                displayName,
                            )
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .background(buttonGradient, RoundedCornerShape(10.dp)),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                        shape = RoundedCornerShape(10.dp),
                        enabled = !isSubmitting,
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                strokeWidth = 2.dp,
                                modifier = Modifier.height(22.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        } else {
                            Text(
                                text = if (isRegister) "Зарегистрироваться" else "Войти",
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }
                    }

                    TextButton(onClick = { isRegister = !isRegister }) {
                        Text(
                            text = if (isRegister) {
                                "Уже есть аккаунт? Войти"
                            } else {
                                "Нет аккаунта? Регистрация"
                            },
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }

            Text(
                text = "Фаза 2 · Живой auth API",
                style = MaterialTheme.typography.labelSmall,
                color = Message2Theme.extraColors.muted,
                modifier = Modifier.padding(top = 20.dp),
            )
        }
    }
}
