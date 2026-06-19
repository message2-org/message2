package ru.message2.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

@Composable
fun BrandLogo(
    modifier: Modifier = Modifier,
    size: Dp = 56.dp,
    darkTheme: Boolean,
) {
    val circleColor = if (darkTheme) Color(0xFF8774E1) else Color(0xFF2E78E8)
    val planeColor = if (darkTheme) Color(0xFF111218) else Color(0xFFF5F8FF)

    Canvas(modifier = modifier.size(size)) {
        val radius = this.size.minDimension / 2f
        drawCircle(color = circleColor, radius = radius, center = Offset(radius, radius))

        val path = Path().apply {
            moveTo(radius * 0.35f, radius * 1.05f)
            lineTo(radius * 1.55f, radius * 0.55f)
            lineTo(radius * 0.95f, radius * 0.85f)
            lineTo(radius * 1.15f, radius * 1.35f)
            lineTo(radius * 0.85f, radius * 1.05f)
            close()
        }
        drawPath(path, planeColor)
    }
}

@Composable
fun BrandLogoWithFallback(
    modifier: Modifier = Modifier,
    size: Dp = 56.dp,
) {
    BrandLogo(modifier = modifier, size = size, darkTheme = MaterialTheme.colorScheme.background.luminance() < 0.5f)
}

private fun Color.luminance(): Float {
    return 0.299f * red + 0.587f * green + 0.114f * blue
}
