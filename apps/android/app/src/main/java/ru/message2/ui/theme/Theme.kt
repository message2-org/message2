package ru.message2.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

data class Message2ExtraColors(
    val soft: Color,
    val muted: Color,
    val sidebar: Color,
    val chatHeader: Color,
    val bubbleMe: Color,
    val bubbleOther: Color,
    val accentGradientStart: Color,
    val accentGradientEnd: Color,
)

val LocalMessage2ExtraColors = staticCompositionLocalOf {
    Message2ExtraColors(
        soft = LightSoft,
        muted = LightMuted,
        sidebar = LightSidebar,
        chatHeader = LightChatHeader,
        bubbleMe = LightAccent.copy(alpha = 0.18f),
        bubbleOther = LightPanel,
        accentGradientStart = LightAccent2,
        accentGradientEnd = LightAccent3,
    )
}

private val LightColorScheme = lightColorScheme(
    primary = LightAccent,
    onPrimary = OnAccent,
    secondary = LightAccent2,
    background = LightBg,
    onBackground = LightText,
    surface = LightPanel,
    onSurface = LightText,
    surfaceVariant = LightSoft,
    onSurfaceVariant = LightMuted,
    outline = LightBorder,
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkAccent,
    onPrimary = OnAccent,
    secondary = DarkAccent2,
    background = DarkBg,
    onBackground = DarkText,
    surface = DarkPanel,
    onSurface = DarkText,
    surfaceVariant = DarkSoft,
    onSurfaceVariant = DarkMuted,
    outline = DarkBorder,
)

private val LightExtra = Message2ExtraColors(
    soft = LightSoft,
    muted = LightMuted,
    sidebar = LightSidebar,
    chatHeader = LightChatHeader,
    bubbleMe = LightAccent.copy(alpha = 0.16f),
    bubbleOther = LightPanel,
    accentGradientStart = LightAccent2,
    accentGradientEnd = LightAccent3,
)

private val DarkExtra = Message2ExtraColors(
    soft = DarkSoft,
    muted = DarkMuted,
    sidebar = DarkSidebar,
    chatHeader = DarkChatHeader,
    bubbleMe = DarkAccent.copy(alpha = 0.28f),
    bubbleOther = DarkPanel,
    accentGradientStart = DarkAccent2,
    accentGradientEnd = DarkAccent3,
)

@Composable
fun Message2Theme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val extra = if (darkTheme) DarkExtra else LightExtra

    CompositionLocalProvider(LocalMessage2ExtraColors provides extra) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = Message2Typography,
            content = content,
        )
    }
}

object Message2Theme {
    val extraColors: Message2ExtraColors
        @Composable
        get() = LocalMessage2ExtraColors.current
}
