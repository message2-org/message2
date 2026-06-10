package ru.message2.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColors = darkColorScheme(
    primary = Color(0xFF6EA8FF),
    secondary = Color(0xFF8BD0C7),
    background = Color(0xFF0F1524),
    surface = Color(0xFF182235),
    onBackground = Color(0xFFE8EDF8),
    onSurface = Color(0xFFE8EDF8)
)

private val LightColors = lightColorScheme(
    primary = Color(0xFF2F5FBF),
    secondary = Color(0xFF2E8B7A),
    background = Color(0xFFF4F7FC),
    surface = Color(0xFFFFFFFF)
)

@Composable
fun Message2Theme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = if (dark) DarkColors else LightColors,
        content = content
    )
}
