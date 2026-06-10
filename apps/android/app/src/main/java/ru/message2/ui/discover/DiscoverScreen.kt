package ru.message2.ui.discover

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import ru.message2.data.DiscoverUser

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(
    query: String,
    users: List<DiscoverUser>,
    onBack: () -> Unit,
    onQueryChange: (String) -> Unit,
    onSelectUser: (DiscoverUser) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Новый диалог") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Назад")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            OutlinedTextField(
                value = query,
                onValueChange = onQueryChange,
                label = { Text("Поиск по логину или имени") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            )
            if (query.trim().length < 2) {
                Text(
                    "Введите минимум 2 символа",
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }
            LazyColumn {
                items(users, key = { it.id }) { user ->
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectUser(user) }
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                    ) {
                        Text(user.displayName.ifBlank { user.username }, style = MaterialTheme.typography.titleMedium)
                        Text("@${user.username}", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}
