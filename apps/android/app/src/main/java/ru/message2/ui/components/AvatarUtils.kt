package ru.message2.ui.components

fun buildUserInitials(displayName: String): String {
    val words = displayName.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }
    if (words.isEmpty()) return "?"
    return words.take(2).mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.joinToString("")
        .ifEmpty { "?" }
}

fun avatarHue(seed: String): Float {
    var hash = 0
    val normalized = seed.trim().ifEmpty { "user" }
    for (char in normalized) {
        hash = (hash * 31 + char.code) or 0
    }
    return (kotlin.math.abs(hash) % 360).toFloat()
}
